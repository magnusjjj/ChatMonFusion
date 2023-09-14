/*
	Graciosly donated by the ever so kind Daena.
	She made the https://if.daena.me/
	She licensed it under the CC0
*/

const fs = require("fs");
const path = require("path");
const Marshal = require("./lib/Marshal.js");

async function main() {
	const marshal = await Marshal.fromReadable(
		fs.createReadStream(path.join(__dirname, "species.dat"))
	);

	marshal.links = false;
	
	const jout = fs.createWriteStream("out.json");
	jout.write("[");

	/**
	 * species.dat is a large associative array alternating between:
	 *   [pokemon numeric id, pokemon data]
	 * and
	 *   [pokemon string id, link to pokemon data]
	 *
	 * Since both the numeric id and the string id are available in the pokemon
	 * data, we ignore every instance of a string key, since those will always
	 * only hold a link.
	 */

	for await (const [key, value] of marshal.streamDecode()) {
		if (
			"object" !== typeof value ||
			value == null ||
			key !== value["@id_number"]
		) {
			continue;
		}
		
/*		if(value["@real_name"] == "Magchic"){
			console.log(key, value["@id"], value["@real_name"]);
		}*/
		jout.write(JSON.stringify([key, value["@id"], value["@real_name"]])+",");
		//console.log(key, value["@id"], value["@real_name"]);
		/**
		 * Ignore any row where the pokemon data `@id_number` doesn't match the
		 * key, ie only parse every pokemon data once.
		 
		if (
			"object" !== typeof value ||
			value == null ||
			key !== value["@id_number"]
		) {
			continue;
		}
		*/

		/**
		 * Example value:
		 * {
		 *   '@id': 'RATTATA',
		 *   '@id_number': 19,
		 *   '@species': 'RATTATA',
		 *   '@form': 0,
		 *   '@real_name': 'Rattata',
		 *   '@real_form_name': null,
		 *   '@real_category': 'Mouse',
		 *   '@real_pokedex_entry': 'A Rattata is cautious in the extreme. Even while it is asleep, it constantly moves its ears and listens for danger. It will make its nest anywhere.',
		 *   '@pokedex_form': 0,
		 *   '@type1': 'NORMAL',
		 *   '@type2': 'NORMAL',
		 *   '@base_stats': [Object: null prototype] {
		 *     HP: 30,
		 *     ATTACK: 56,
		 *     DEFENSE: 35,
		 *     SPECIAL_ATTACK: 25,
		 *     SPECIAL_DEFENSE: 35,
		 *     SPEED: 72
		 *   },
		 *   '@evs': [Object: null prototype] {
		 *     HP: 0,
		 *     ATTACK: 0,
		 *     DEFENSE: 0,
		 *     SPECIAL_ATTACK: 0,
		 *     SPECIAL_DEFENSE: 0,
		 *     SPEED: 1
		 *   },
		 *   '@base_exp': 51,
		 *   '@growth_rate': 'Medium',
		 *   '@gender_ratio': 'Female50Percent',
		 *   '@catch_rate': 255,
		 *   '@happiness': 70,
		 *   '@moves': [
		 *     [ 1, 'TACKLE' ],
		 *     [ 1, 'TAILWHIP' ],
		 *     [ 4, 'QUICKATTACK' ],
		 *     [ 7, 'FOCUSENERGY' ],
		 *     [ 10, 'BITE' ],
		 *     [ 13, 'PURSUIT' ],
		 *     [ 16, 'HYPERFANG' ],
		 *     [ 19, 'ASSURANCE' ],
		 *     [ 22, 'CRUNCH' ],
		 *     [ 25, 'SUCKERPUNCH' ],
		 *     [ 28, 'SUPERFANG' ],
		 *     [ 31, 'DOUBLEEDGE' ],
		 *     [ 34, 'ENDEAVOR' ]
		 *   ],
		 *   '@tutor_moves': [
		 *     'ATTRACT',     'BLIZZARD',    'CHARGEBEAM',
		 *     'CONFIDE',     'COVET',       'CUT',
		 *     'DOUBLETEAM',  'ENDEAVOR',    'FACADE',
		 *     'FRUSTRATION', 'GRASSKNOT',   'HIDDENPOWER',
		 *     'ICEBEAM',     'ICYWIND',     'IRONTAIL',
		 *     'LASTRESORT',  'PROTECT',     'RAINDANCE',
		 *     'REST',        'RETURN',      'ROCKSMASH',
		 *     'ROUND',       'SHADOWBALL',  'SHOCKWAVE',
		 *     'SLEEPTALK',   'SNORE',       'SUBSTITUTE',
		 *     'SUNNYDAY',    'SUPERFANG',   'SWAGGER',
		 *     'TAUNT',       'THIEF',       'THUNDER',
		 *     'THUNDERBOLT', 'THUNDERWAVE', 'TOXIC',
		 *     'UPROAR',      'UTURN',       'WILDCHARGE',
		 *     'WORKUP',      'ZENHEADBUTT', 'DIG',
		 *     'RETALIATE',   'PLUCK',       'MUDSLAP',
		 *     'SUCKERPUNCH', 'SWIFT'
		 *   ],
		 *   '@egg_moves': [
		 *     'BITE',        'COUNTER',
		 *     'FINALGAMBIT', 'FLAMEWHEEL',
		 *     'FURYSWIPES',  'LASTRESORT',
		 *     'MEFIRST',     'REVENGE',
		 *     'REVERSAL',    'SCREECH',
		 *     'UPROAR'
		 *   ],
		 *   '@abilities': [ 'RUNAWAY', 'GUTS' ],
		 *   '@hidden_abilities': [ 'HUSTLE' ],
		 *   '@wild_item_common': null,
		 *   '@wild_item_uncommon': 'CHILANBERRY',
		 *   '@wild_item_rare': null,
		 *   '@egg_groups': [ 'Field' ],
		 *   '@hatch_steps': 4080,
		 *   '@incense': null,
		 *   '@evolutions': [ [ 'RATICATE', 'Level', 20, false ] ],
		 *   '@height': 3,
		 *   '@weight': 35,
		 *   '@color': 'Purple',
		 *   '@shape': 'Head',
		 *   '@habitat': 'Grassland',
		 *   '@generation': 0,
		 *   '@mega_stone': null,
		 *   '@mega_move': null,
		 *   '@unmega_form': 0,
		 *   '@mega_message': 0,
		 *   '@back_sprite_x': 0,
		 *   '@back_sprite_y': 32,
		 *   '@front_sprite_x': 0,
		 *   '@front_sprite_y': 22,
		 *   '@front_sprite_altitude': 0,
		 *   '@shadow_x': 0,
		 *   '@shadow_size': 2,
		 *   '@alwaysUseGeneratedSprite': false,
		 *   [Symbol(name)]: 'GameData::Species'
		 * }
		 */

		// console.log(key, value);
	}
	jout.write("]");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
