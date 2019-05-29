# Livecoding presentation

Slides for a presentation about the awesome practice of livecoding given at [Mirado Consulting](https://www.mirado.com/). _Note:_ the presentation contained a big demo section, and there are no speaker notes included within the slide deck.

Written in the [bespoke](http://markdalgleish.com/projects/bespoke.js/) presentation framework, using the [boluge](https://github.com/boluge/bespoke-theme-boluge) theme.

Contains an integrated plugin for controlling slides with an electric guitar, powered by [https://www.npmjs.com/package/chord_detector](chord_detector). The guitar control doesn't actually use chord_detector's chord detection as I had issues with getting it to work accurately with my setup, so instead you have to strum certain notes to advance the slide. The plugin is currently somewhat integrated within this presentation, but it should be possible to refactor it into its own installable plugin. Might get around to doing that later :)

_NOTE_: at the moment there's a bug with audio input from a guitar. If you want to control the presentation using a guitar, follow the following steps exactly:

1. `npm i`
2. `npm start`
3. http://localhost:8080/
4. Make a modification to `index.html` to trigger a rebuild and hot module reloading, which fixes the audio input.
