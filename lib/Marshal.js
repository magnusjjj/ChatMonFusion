const StreamReader = require("./StreamReader.js");

const decoder = new TextDecoder();
const decode = decoder.decode.bind(decoder);

class Link {
	/** @param {number} i */
	constructor(i) {
		this.i = i;
	}
}

class Marshal {
	links = true;
	static NAME_SYMBOL = Symbol("name");

	/**
	 * @type {{[char: string]: (this: Marshal) => Promise<any>}}
	 */
	static DECODE_MAP = {
		async 0() {
			return null;
		},
		async T() {
			return true;
		},
		async F() {
			return false;
		},
		async "@"() {
			return this.decodeLink();
		},
		async i() {
			return this.decodeFixnum();
		},
		async l() {
			return this.decodeBignum();
		},
		async f() {
			return this.decodeFloat();
		},
		async '"'() {
			return this.entry(this.decodeString());
		},
		async ":"() {
			return this.decodeSymbol();
		},
		async ";"() {
			return this.decodeSymbolLink();
		},
		async "["() {
			return this.decodeArray();
		},
		async o() {
			return this.decodeObject();
		},
		async "{"() {
			return this.decodeHash();
		},
		async "}"() {
			throw new Error(
				"Decoding Hash with default value is not supported."
			);
		},
		async "/"() {
			throw new Error("Decoding RegExps is not supported.");
		},
		async d() {
			throw new Error("Decoding Data Objects is not supported.");
		},
		async e() {
			throw new Error("Decoding Extended Objects is not supported.");
		},
		async c() {
			throw new Error("Decoding Classes is not supported.");
		},
		async C() {
			throw new Error("Decoding User Classes is not supported.");
		},
		async m() {
			throw new Error("Decoding Modules is not supported.");
		},
		async M() {
			throw new Error("Decoding Modules is not supported.");
		},
		async I() {
			throw new Error("Decoding IVars is not supported.");
		},
		async S() {
			throw new Error("Decoding Structs is not supported.");
		},
		async u() {
			throw new Error(
				"Decoding User defined serializations is not supported."
			);
		},
		async U() {
			throw new Error(
				"Decoding User defined serializations is not supported."
			);
		},
	};

	/**
	 * @type {{[char: string]: (this: Marshal) => AsyncIterableIterator<any>}}
	 */
	static STREAM_DECODE_MAP = {
		async *"["() {
			const length = await this.decodeFixnum();
			if (length < 0) throw new Error("Negative array length.");

			for (let i = 0; i < length; ++i) yield await this.decode();
		},
		async *"{"() {
			const map = Object.create(null);

			for await (const [key, value] of this.decodeTuples()) {
				map[key] = value;
				yield [key, value];
			}
		},
		async *o() {
			const name = await this.decode();

			const map = Object.create(null);
			map[Marshal.NAME_SYMBOL] = name;

			yield [Marshal.NAME_SYMBOL, name];
			for await (const [key, value] of this.decodeTuples()) {
				map[key] = value;
				yield [key, value];
			}
		},
	};

	/** @type {StreamReader} */
	reader;

	/** @type {number} */
	majorVersion;
	/** @type {number} */
	minorVersion;

	/** @type {string[]} */
	symbols = [];
	/** @type {any[]} */
	linkable = [];

	/**
	 * @param {any} object
	 * @return {object}
	 */
	entry(object) {
		if (this.links) this.linkable.push(object);
		return object;
	}

	async *streamDecode() {
		const type = String.fromCharCode(await this.reader.readByte());
		const streamDecoder = Marshal.STREAM_DECODE_MAP[type];

		if (streamDecoder == null)
			throw new Error(`Cannot stream decode Marshal type '${type}'.`);

		yield* streamDecoder.call(this);
	}

	async decode() {
		const type = String.fromCharCode(await this.reader.readByte());
		const decoder = Marshal.DECODE_MAP[type];

		if (decoder == null) throw new Error(`Unknown Marshal type '${type}'.`);

		return await decoder.call(this);
	}

	// Fixnum and Long are encoded the same way
	async decodeFixnum() {
		let num = await this.reader.readByte();
		if (num === 0) return 0;
		if (num > 4) return num - 5;
		if (num < -4) return num + 5;

		const size = Math.abs(num);
		num = num > 0 ? 0 : -1;
		const buffer = await this.reader.readBuffer(size);

		for (let i = 0; i < size; ++i) {
			if (num < 0) num &= 0 ^ (0xff << (8 * i));
			num |= buffer[i] << (8 * i);
		}

		return num;
	}

	async decodeFloat() {
		const length = await this.decodeFixnum();
		const string = decode(await this.reader.readBuffer(length));

		let float;
		switch (string) {
			case "inf":
				float = Infinity;
				break;
			case "-inf":
				float = -Infinity;
				break;
			case "nan":
				float = NaN;
				break;
			default:
				float = parseFloat(string);
		}

		return this.entry(float);
	}

	async decodeBignum() {
		const prefix = await this.reader.readByte();
		// Either '+' or '-'
		if (prefix !== 0x2b && prefix !== 0x2d)
			throw new Error(
				`Unexpected Bignum prefix '${String.fromCharCode(prefix)}'.`
			);

		const length = 2 * (await this.decodeFixnum());
		const buffer = await this.reader.readBuffer(length);

		let result = 0n;
		for (let i = 0; i < length; ++i)
			result |= BigInt(buffer[i]) << BigInt(8 * i);

		// Prefixed with '-' => number is negative
		if (prefix === 0x2d) result *= -1n;

		return this.entry(result);
	}

	async decodeString() {
		const length = await this.decodeFixnum();
		const string = decode(await this.reader.readBuffer(length));
		return string;
	}

	async decodeSymbol() {
		const symbol = await this.decodeString();
		this.symbols.push(symbol);
		return symbol;
	}

	async decodeSymbolLink() {
		const index = await this.decodeFixnum();
		if (index < 0 || index > this.symbols.length)
			throw new Error("Symbol reference out of range.");

		return this.symbols[index];
	}

	async decodeArray() {
		const array = this.entry([]);

		const length = await this.decodeFixnum();
		if (length < 0) throw new Error("Negative array length.");

		for (let i = 0; i < length; ++i) {
			array[i] = await this.decode();
		}

		return array;
	}

	async *decodeTuples() {
		const length = await this.decodeFixnum();
		if (length < 0) throw new Error("Negative key count in hash.");

		for (let i = 0; i < length; ++i) {
			const key = await this.decode();
			const value = await this.decode();
			yield [key, value];
		}
	}

	async decodeHash() {
		const map = this.entry(Object.create(null));

		for await (const [key, value] of this.decodeTuples()) map[key] = value;

		return map;
	}

	async decodeObject() {
		const name = await this.decode();
		const namedMap = this.entry(Object.create(null));
		namedMap[Marshal.NAME_SYMBOL] = name;

		for await (const [key, value] of this.decodeTuples())
			namedMap[key] = value;

		return namedMap;
	}

	async decodeLink() {
		const index = (await this.decodeFixnum()) - 1;
		if (!this.links) return new Link(index);

		if (index < 0 || index >= this.linkable.length)
			throw new Error("Object reference out of range.");

		return this.linkable[index];
	}

	/**
	 * @param {import("stream").Readable} readable
	 * @return {Promise<Marshal>}
	 */
	static async fromReadable(readable) {
		const reader = StreamReader.fromReadable(readable);
		const major = await reader.readByte();
		const minor = await reader.readByte();
		if (major !== 4)
			throw new Error(
				`Unsupported Marshal major version ${major}.${minor}.`
			);

		if (minor > 8)
			throw new Error(
				`Unsupported Marshal minor version ${major}.${minor}.`
			);

		const marshal = new Marshal();
		marshal.reader = reader;

		marshal.majorVersion = major;
		marshal.minorVersion = minor;

		return marshal;
	}
}

module.exports = Marshal;
