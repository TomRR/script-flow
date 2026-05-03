import { Window } from 'happy-dom'

console.log('=== LOADING TEST SETUP ===')

const window = new Window({
    url: 'http://localhost:3000',
    width: 1920,
    height: 1080,
})

globalThis.window = window
globalThis.document = window.document
globalThis.navigator = window.navigator

console.log('=== WINDOW SETUP COMPLETE ===')
console.log('window defined:', typeof globalThis.window !== 'undefined')
