const shouldDebug = require("./config").shouldDebug;

module.exports["log"] = function() {
	if (shouldDebug)
		console.log.apply(console, arguments);
}

module.exports["warn"] = function() {
	if (shouldDebug)
		console.warn.apply(console, arguments);
}