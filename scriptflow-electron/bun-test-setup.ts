import { Window } from 'happy-dom'

const window = new Window({
    url: 'http://localhost:3000',
    width: 1920,
    height: 1080,
})

globalThis.window = window
globalThis.document = window.document
