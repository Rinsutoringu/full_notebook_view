// -----------------------------------------------------------------------------
// This file is used to build the plugin file (.jpl) and plugin info (.json). It
// is recommended not to edit this file as it would be overwritten when updating
// the plugin framework.
// -----------------------------------------------------------------------------

const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');
const chalk = require('chalk');
const CopyPlugin = require('copy-webpack-plugin');
const tar = require('tar');
const glob = require('glob');
const execSync = require('child_process').execSync;

const allPossibleCategories = [{ 'name': 'appearance' }, { 'name': 'developer tools' }, { 'name': 'productivity' }, { 'name': 'themes' }, { 'name': 'integrations' }, { 'name': 'viewer' }, { 'name': 'search' }, { 'name': 'tags' }, { 'name': 'editor' }, { 'name': 'files' }, { 'name': 'personal knowledge management' }];

const rootDir = path.resolve(__dirname);
const userConfigFilename = './plugin.config.json';
const userConfigPath = path.resolve(rootDir, userConfigFilename);
const distDir = path.resolve(rootDir, 'dist');
const srcDir = path.resolve(rootDir, 'src');
const publishDir = path.resolve(rootDir, 'publish');

const userConfig = {
	extraScripts: [],
	...(fs.pathExistsSync(userConfigPath) ? require(userConfigFilename) : {}),
};

const manifestPath = `${srcDir}/manifest.json`;
const packageJsonPath = `${rootDir}/package.json`;
const allPossibleScreenshotsType = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const manifest = readManifest(manifestPath);
const pluginArchiveFilePath = path.resolve(publishDir, `${manifest.id}.jpl`);
const pluginInfoFilePath = path.resolve(publishDir, `${manifest.id}.json`);

const { builtinModules } = require('node:module');

const moduleFallback = {};
for (const moduleName of builtinModules) {
	moduleFallback[moduleName] = false;
}

const getPackageJson = () => {
	return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
};

function validatePackageJson() {
	const content = getPackageJson();
	if (!content.name || content.name.indexOf('joplin-plugin-') !== 0) {
		console.warn(chalk.yellow(`WARNING: To publish the plugin, the package name should start with "joplin-plugin-" (found "${content.name}") in ${packageJsonPath}`));
	}

	if (!content.keywords || content.keywords.indexOf('joplin-plugin') < 0) {
		console.warn(chalk.yellow(`WARNING: To publish the plugin, the package keywords should include "joplin-plugin" (found "${JSON.stringify(content.keywords)}") in ${packageJsonPath}`));
	}

	if (content.scripts && content.scripts.postinstall) {
		console.warn(chalk.yellow(`WARNING: package.json contains a "postinstall" script. It is recommended to use a "prepare" script instead so that it is executed before publish. In ${packageJsonPath}`));
	}
}

function fileSha256(filePath) {
	const content = fs.readFileSync(filePath);
	return crypto.createHash('sha256').update(content).digest('hex');
}

function currentGitInfo() {
	try {
		let branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' }).toString().trim();
		const commit = execSync('git rev-parse HEAD', { stdio: 'pipe' }).toString().trim();
		if (branch === 'HEAD') branch = 'master';
		return `${branch}:${commit}`;
	} catch (error) {
		const messages = error.message ? error.message.split('\n') : [''];
		console.info(chalk.cyan('Could not get git commit (not a git repo?):', messages[0].trim()));
		console.info(chalk.cyan('Git information will not be stored in plugin info file'));
		return '';
	}
}

function validateCategories(categories) {
	if (!categories) return null;
	if ((categories.length !== new Set(categories).size)) throw new Error('Repeated categories are not allowed');
	categories.forEach(category => {
		if (!allPossibleCategories.map(category => { return category.name; }).includes(category)) throw new Error(`${category} is not a valid category.`);
	});
}

function validateScreenshots(screenshots) {
	if (!screenshots) return null;
	for (const screenshot of screenshots) {
		if (!screenshot.src) throw new Error('You must specify a src for each screenshot');
		if (screenshot.src.startsWith('https://') || screenshot.src.startsWith('http://')) {
			continue;
		}
		const screenshotType = screenshot.src.split('.').pop();
		if (!allPossibleScreenshotsType.includes(screenshotType)) throw new Error(`${screenshotType} is not a valid screenshot type.`);
		const screenshotPath = path.resolve(rootDir, screenshot.src);
		const fileMaxSize = 1024;
		const fileSize = fs.statSync(screenshotPath).size / 1024;
		if (fileSize > fileMaxSize) throw new Error(`Max screenshot file size is ${fileMaxSize}KB. ${screenshotPath} is ${fileSize}KB`);
	}
}

function readManifest(manifestPath) {
	const content = fs.readFileSync(manifestPath, 'utf8');
	const output = JSON.parse(content);
	if (!output.id) throw new Error(`Manifest plugin ID is not set in ${manifestPath}`);
	validateCategories(output.categories);
	validateScreenshots(output.screenshots);
	return output;
}

function createPluginArchive(sourceDir, destPath) {
	const distFiles = glob.sync(`${sourceDir}/**/*`, { nodir: true, windowsPathsNoEscape: true })
		.map(f => f.substr(sourceDir.length + 1));

	if (!distFiles.length) throw new Error('Plugin archive was not created because the "dist" directory is empty');
	fs.removeSync(destPath);

	tar.create(
		{
			strict: true,
			portable: true,
			file: destPath,
			cwd: sourceDir,
			sync: true,
		},
		distFiles,
	);

	console.info(chalk.cyan(`Plugin archive has been created in ${destPath}`));
}

const writeManifest = (manifestPath, content) => {
	fs.writeFileSync(manifestPath, JSON.stringify(content, null, '\t'), 'utf8');
};

function createPluginInfo(manifestPath, destPath, jplFilePath) {
	const contentText = fs.readFileSync(manifestPath, 'utf8');
	const content = JSON.parse(contentText);
	content._publish_hash = `sha256:${fileSha256(jplFilePath)}`;
	content._publish_commit = currentGitInfo();
	writeManifest(destPath, content);
}

function onBuildCompleted() {
	try {
		fs.removeSync(path.resolve(publishDir, 'index.js'));
		createPluginArchive(distDir, pluginArchiveFilePath);
		createPluginInfo(manifestPath, pluginInfoFilePath, pluginArchiveFilePath);
		validatePackageJson();
	} catch (error) {
		console.error(chalk.red(error.message));
	}
}

const baseConfig = {
	mode: 'production',
	target: 'node',
	stats: 'errors-only',
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	...userConfig.webpackOverrides,
};

const pluginConfig = {
	...baseConfig,
	entry: './src/index.ts',
	resolve: {
		alias: {
			api: path.resolve(__dirname, 'api'),
		},
		fallback: moduleFallback,
		extensions: ['.js', '.tsx', '.ts', '.json'],
	},
	output: {
		filename: 'index.js',
		path: distDir,
	},
	plugins: [
		new CopyPlugin({
			patterns: [
				{
					from: '**/*',
					context: path.resolve(__dirname, 'src'),
					to: path.resolve(__dirname, 'dist'),
					globOptions: {
						ignore: [
							'**/*.ts',
							'**/*.tsx',
						],
					},
				},
			],
		}),
	],
};

const externalContentScriptLibraries = [
	'@codemirror/view',
	'@codemirror/state',
	'@codemirror/search',
	'@codemirror/language',
	'@codemirror/autocomplete',
	'@codemirror/commands',
	'@codemirror/highlight',
	'@codemirror/lint',
	'@codemirror/lang-html',
	'@codemirror/lang-markdown',
	'@codemirror/language-data',
	'@lezer/common',
	'@lezer/markdown',
	'@lezer/highlight',
];

const extraScriptExternals = {};
for (const library of externalContentScriptLibraries) {
	extraScriptExternals[library] = { commonjs: library };
}

const extraScriptConfig = {
	...baseConfig,
	resolve: {
		alias: {
			api: path.resolve(__dirname, 'api'),
		},
		fallback: moduleFallback,
		extensions: ['.js', '.tsx', '.ts', '.json'],
	},
	externalsType: 'commonjs',
	externals: extraScriptExternals,
};

const createArchiveConfig = {
	stats: 'errors-only',
	entry: './dist/index.js',
	resolve: {
		fallback: moduleFallback,
	},
	output: {
		filename: 'index.js',
		path: publishDir,
	},
	plugins: [{
		apply(compiler) {
			compiler.hooks.done.tap('archiveOnBuildListener', onBuildCompleted);
		},
	}],
};

function resolveExtraScriptPath(name) {
	const relativePath = `./src/${name}`;
	const fullPath = path.resolve(`${rootDir}/${relativePath}`);
	if (!fs.pathExistsSync(fullPath)) throw new Error(`Could not find extra script: "${name}" at "${fullPath}"`);

	const s = name.split('.');
	s.pop();
	const nameNoExt = s.join('.');

	return {
		entry: relativePath,
		output: {
			filename: `${nameNoExt}.js`,
			path: distDir,
			library: 'default',
			libraryTarget: 'commonjs',
			libraryExport: 'default',
		},
	};
}

function buildExtraScriptConfigs(userConfig) {
	if (!userConfig.extraScripts.length) return [];
	const output = [];
	for (const scriptName of userConfig.extraScripts) {
		const scriptPaths = resolveExtraScriptPath(scriptName);
		output.push({ ...extraScriptConfig, entry: scriptPaths.entry, output: scriptPaths.output });
	}
	return output;
}

const increaseVersion = version => {
	try {
		const s = version.split('.');
		const d = Number(s[s.length - 1]) + 1;
		s[s.length - 1] = `${d}`;
		return s.join('.');
	} catch (error) {
		error.message = `Could not parse version number: ${version}: ${error.message}`;
		throw error;
	}
};

const updateVersion = () => {
	const packageJson = getPackageJson();
	packageJson.version = increaseVersion(packageJson.version);
	fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

	const manifest = readManifest(manifestPath);
	manifest.version = increaseVersion(manifest.version);
	writeManifest(manifestPath, manifest);

	if (packageJson.version !== manifest.version) {
		console.warn(chalk.yellow(`Version numbers have been updated but they do not match.`));
	} else {
		console.info(packageJson.version);
	}
};

function main(environ) {
	const configName = environ['joplin-plugin-config'];
	if (!configName) throw new Error('A config file must be specified via the --joplin-plugin-config flag');

	const configs = {
		buildMain: [pluginConfig],
		buildExtraScripts: buildExtraScriptConfigs(userConfig),
		createArchive: [createArchiveConfig],
	};

	if (configName === 'buildMain') {
		fs.removeSync(distDir);
		fs.removeSync(publishDir);
		fs.mkdirpSync(publishDir);
	}

	if (configName === 'updateVersion') {
		updateVersion();
		return [];
	}

	return configs[configName];
}

module.exports = (env) => {
	let exportedConfigs = [];

	try {
		exportedConfigs = main(env);
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}

	if (!exportedConfigs.length) {
		process.exit(0);
	}

	return exportedConfigs;
};
