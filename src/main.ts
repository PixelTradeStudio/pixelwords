import './styles/main.css'
import { GameApp } from './ui/GameApp.ts'

const appRoot = document.querySelector<HTMLDivElement>('#app')
if (!appRoot) throw new Error('PixelWords app root is missing')

const game = new GameApp(appRoot)
game.start()

window.addEventListener('beforeunload', () => game.dispose())
