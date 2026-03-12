export default class JoplinPlugins {
	register(script: { onStart: () => Promise<void> }): void;
}
