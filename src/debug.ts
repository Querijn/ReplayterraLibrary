import config from "./config";

export default {
	log: function(...args: any[]) {
		if (config.shouldDebug)
			console.log.apply(console, arguments);
	},

	warn: function(...args: any[]) {
		if (config.shouldDebug)
			console.warn.apply(console, arguments);
	},
	
	error: function(...args: any[]) {
		if (config.shouldDebug)
			console.error.apply(console, arguments);
	}
};