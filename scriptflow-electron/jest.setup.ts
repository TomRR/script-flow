import { Window } from 'happy-dom'

const window = new Window({
    url: 'http://localhost:3000',
    width: 1920,
    height: 1080,
})

// @ts-ignore - Set up global window and document
global.window = window
global.document = window.document
global.navigator = window.navigator
global.localStorage = window.localStorage
global.sessionStorage = window.sessionStorage
global.location = window.location
global.XMLHttpRequest = window.XMLHttpRequest
global.fetch = window.fetch
global.Request = window.Request
global.Response = window.Response
global.Headers = window.Headers
global.FormData = window.FormData
global.URL = window.URL
global.URLSearchParams = window.URLSearchParams
global.Blob = window.Blob
global.File = window.File
global.FileReader = window.FileReader
global.WebSocket = window.WebSocket
global.Event = window.Event
global.CustomEvent = window.CustomEvent
global.MouseEvent = window.MouseEvent
global.KeyboardEvent = window.KeyboardEvent
global.FocusEvent = window.FocusEvent
global.InputEvent = window.InputEvent
global.HTMLElement = window.HTMLElement
global.Element = window.Element
global.Node = window.Node
global.NodeList = window.NodeList
global.DocumentFragment = window.DocumentFragment
global.Document = window.Document
