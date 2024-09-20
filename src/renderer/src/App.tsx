import ganeshaLogo from './assets/ganesha.png'
import { useState } from 'react'
import { IPCMainActions, IPCRendererActions } from '../../types'

const App = (): JSX.Element => {
  const [isRecording, setIsRecording] = useState(false)
  const [countdown, setCountdown] = useState(3)

  window.electron.ipcRenderer.on(IPCMainActions.TOGGLE_RECORDING_STATE, (_, args) => {
    setIsRecording(args)
  })

  window.electron.ipcRenderer.on(IPCMainActions.SET_COUNTDOWN, (_, args) => {
    setCountdown(args)
  })

  return (
    <>
      <img alt="logo" className="logo" src={ganeshaLogo} />
      <div className="creator">
        <p>Sua atividade será monitorada a cada</p>
        <select
          name="monitoring-time"
          id=""
          onChange={(ev) => {
            window.electron.ipcRenderer.send(
              IPCRendererActions.CHANGE_SCREENSHOT_INTERVAL,
              parseInt(ev.target.value)
            )
          }}
        >
          <option value="30000">30 segundos</option>
          <option value="60000">1 minuto</option>
          <option value="3000000">5 minutos</option>
        </select>
      </div>

      <div className="actions">
        <button
          className="action"
          onClick={() => {
            !isRecording
              ? window.electron.ipcRenderer.send(IPCRendererActions.START_SCREENSHOTS)
              : window.electron.ipcRenderer.send(IPCRendererActions.END_SCREENSHOTS)
            setIsRecording((prev) => !prev)
          }}
        >
          {isRecording ? 'Pausar monitoramento' : 'Iniciar monitoramento'}
        </button>
      </div>
      {isRecording && (
        <div>
          <h5>Monitorando tela em {countdown}</h5>
        </div>
      )}
    </>
  )
}

export default App
