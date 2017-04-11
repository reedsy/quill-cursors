var path = require('path');

module.exports = {
	entry: './src/cursors.js',
	output: {
		filename: 'quill-cursors.js',
		path: path.resolve(__dirname, 'dist')
	}
};