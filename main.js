'use strict'

module.exports = {
	load() {
		// execute when package loaded
	},
	unload() {
		// execute when package unloaded
	},
	messages: {
		'open'() {
			// open entry panel registered in package.json
			Editor.Panel.open('cc_excel');
		}
	}
}