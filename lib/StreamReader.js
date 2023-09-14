/*
	Graciosly donated by the ever so kind Daena.
	She made the https://if.daena.me/
	She licensed it under the CC0
*/

class StreamReader {
	static NIL_CHUNK = new Uint8Array(0);

	/** @type {AsyncIterableIterator<Uint8Array>} */
	reader;

	/** @type {number} */
	i = 0;
	/** @type {Uint8Array} */
	chunk = StreamReader.NIL_CHUNK;

	/** @type {number} */
	pastChunkLength = 0;
	get bytesRead() {
		return this.pastChunkLength + this.i;
	}

	/**
	 * @param {AsyncIterableIterator<Uint8Array>} reader
	 */
	constructor(reader) {
		this.reader = reader;
	}

	/**
	 * Get a new chunk from the stream
	 * @return {Promise<Boolean>}
	 */
	async readChunk() {
		if (this.i < this.chunk.byteLength) {
			throw new Error("Current chunk not consumed.");
		}

		while (true) {
			const { done, value } = await this.reader.next();
			if (done) return false;
			if (value.byteLength === 0) continue;
			this.pastChunkLength += this.chunk.byteLength;
			this.chunk = value;
			this.i = 0;
			return true;
		}
	}

	/**
	 * Read a single byte from the stream
	 * @return {Promise<number>}
	 */
	async readByte() {
		if (this.i < this.chunk.byteLength) return this.chunk[this.i++];

		const hasNewData = await this.readChunk();
		if (!hasNewData) throw new Error("Unexpected end of stream.");

		return this.chunk[this.i++];
	}

	/**
	 * Read `length` bytes.
	 * @param {number} length
	 * @return {Promise<Uint8Array>}
	 */
	async readBuffer(length) {
		if (this.i + length <= this.chunk.byteLength)
			return this.chunk.subarray(this.i, (this.i += length));

		const buffer = new Uint8Array(length);
		buffer.set(this.chunk.subarray(this.i));

		let remaining = length - (this.chunk.byteLength - this.i);
		while (true) {
			this.i = this.chunk.byteLength;

			const hasNewData = await this.readChunk();
			if (!hasNewData) throw new Error("Unexpected end of stream.");

			if (this.chunk.byteLength < remaining) {
				buffer.set(this.chunk, length - remaining);
				remaining -= this.chunk.byteLength;
				continue;
			}

			buffer.set(this.chunk.subarray(0, remaining), length - remaining);
			this.i = remaining;
			return buffer;
		}
	}

	/**
	 * End of stream?
	 * @return {Promise<Boolean>}
	 */
	async eos() {
		if (this.i < this.chunk.byteLength) return false;
		return !(await this.readChunk());
	}

	/**
	 * @param {import("stream").Readable} readStream
	 */
	static fromReadable(readStream) {
		return new StreamReader(readStream[Symbol.asyncIterator]());
	}
}

module.exports = StreamReader;
