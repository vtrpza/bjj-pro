import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import jsQR from 'jsqr'
import { Button } from '../../shared/components/Button'
import { PageHeader } from '../../shared/components/PageHeader'
import { buildCheckinValidationBody } from '../../shared/lib/qrCheckin'
import type { CheckinValidationRequest, CheckinValidationResponse } from '../../shared/lib/qrCheckin'
import { hasSupabaseConfig, supabase } from '../../shared/lib/supabase'

type EdgeFunctionError = {
  error?: {
    code?: string
    message?: string
  }
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback

  const edgeError = error as EdgeFunctionError
  const edgeMessage = edgeError?.error?.message

  if (edgeMessage) {
    return edgeMessage
  }

  const directMessage = (error as { message?: string })?.message
  if (directMessage) {
    return directMessage
  }

  return fallback
}

type CheckinResult = {
  studentName: string
  sessionTitle: string
}

export function StudentCheckinPage() {
  const [manualCode, setManualCode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scannerMessage, setScannerMessage] = useState('Abra a camera e aponte para o QR do treino.')
  const [lastResult, setLastResult] = useState<CheckinResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }

      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  async function submitCheckin(body: CheckinValidationRequest) {
    if (!supabase) {
      setErrorMessage('Conecte o Supabase para validar check-in real.')
      return
    }

    setIsSubmitting(true)
    setLastResult(null)
    setErrorMessage(null)

    const { data, error } = await supabase.functions.invoke<CheckinValidationResponse>('checkin-validate', {
      body
    })

    setIsSubmitting(false)

    if (error || !data) {
      const message = extractErrorMessage(error, 'Nao foi possivel confirmar o check-in.')
      setErrorMessage(message)
      return
    }

    setManualCode('')
    setLastResult({ studentName: data.studentName, sessionTitle: data.sessionTitle })
  }

  function resetToScanning() {
    setLastResult(null)
    setErrorMessage(null)
    setManualCode('')
    setScannerMessage('Aponte a camera para o QR exibido pela academia.')
  }

  async function submitManualCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submitCheckin(buildCheckinValidationBody({ manualCode }))
  }

  function stopCameraScan() {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsScanning(false)
    setScannerMessage('Camera pausada. Abra novamente para escanear outro QR.')
  }

  function scanFrame() {
    const canvas = canvasRef.current
    const video = videoRef.current

    if (!canvas || !video || !streamRef.current) {
      return
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const context = canvas.getContext('2d', { willReadFrequently: true })

      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })

        if (qrCode?.data) {
          stopCameraScan()
          void submitCheckin(buildCheckinValidationBody({ scannedValue: qrCode.data }))
          return
        }
      }
    }

    animationFrameRef.current = window.requestAnimationFrame(scanFrame)
  }

  async function startCameraScan() {
    if (!hasSupabaseConfig) {
      setErrorMessage('Modo local: configure o Supabase para validar check-ins.')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Este navegador nao liberou acesso a camera. Use o codigo manual do treino.')
      return
    }

    const video = videoRef.current

    if (!video) {
      setErrorMessage('Leitor de camera indisponivel. Recarregue a tela ou use o codigo manual.')
      return
    }

    setLastResult(null)
    setErrorMessage(null)
    setScannerMessage('Solicitando permissao da camera...')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } }
      })

      streamRef.current = stream
      video.srcObject = stream
      await video.play()

      setIsScanning(true)
      setScannerMessage('Aponte a camera para o QR exibido pela academia.')
      animationFrameRef.current = window.requestAnimationFrame(scanFrame)
    } catch {
      stopCameraScan()
      setErrorMessage('Nao foi possivel acessar a camera. Confira a permissao do navegador ou use o codigo manual.')
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Check-in"
        title="Entrar no treino"
        description="Escaneie o QR exibido pela academia ou use o codigo manual quando a camera nao estiver disponivel."
      />
      <div className="scan-card">
        {lastResult ? (
          <div className="checkin-success">
            <div className="checkin-success-icon">✓</div>
            <h2 className="checkin-success-title">Check-in confirmado</h2>
            <p className="checkin-success-name">{lastResult.studentName}</p>
            <p className="checkin-success-session">{lastResult.sessionTitle}</p>
            <Button isBlock onClick={resetToScanning} variant="accent">
              Fazer outro check-in
            </Button>
          </div>
        ) : (
          <>
            <div className="scan-target">
              <video aria-label="Leitor de QR do treino" className="scan-video" muted playsInline ref={videoRef} />
              {isScanning ? (
                <div className="scan-overlay">
                  <div className="scan-overlay-frame">
                    <div className="scan-overlay-corner scan-overlay-corner--tl" />
                    <div className="scan-overlay-corner scan-overlay-corner--tr" />
                    <div className="scan-overlay-corner scan-overlay-corner--bl" />
                    <div className="scan-overlay-corner scan-overlay-corner--br" />
                  </div>
                  <div className="scan-line" />
                </div>
              ) : (
                <span className="scan-empty">QR</span>
              )}
              <canvas aria-hidden="true" hidden ref={canvasRef} />
            </div>
            <div className="scan-actions">
              {isScanning ? (
                <Button disabled={isSubmitting} isBlock onClick={stopCameraScan} variant="secondary">
                  Pausar camera
                </Button>
              ) : (
                <Button disabled={!hasSupabaseConfig || isSubmitting} isBlock onClick={startCameraScan} variant="accent">
                  Abrir camera para ler QR
                </Button>
              )}
            </div>
            <p className="scan-note">{scannerMessage}</p>
            <form className="manual-checkin-form" onSubmit={submitManualCode}>
              <label className="field">
                <span>Codigo manual do treino</span>
                <input
                  autoCapitalize="characters"
                  autoComplete="one-time-code"
                  disabled={!hasSupabaseConfig || isSubmitting}
                  maxLength={10}
                  onChange={(event) => setManualCode(event.target.value.trim().toUpperCase())}
                  placeholder="Ex.: A1B2C3D4EF"
                  required
                  value={manualCode}
                />
              </label>
              <Button disabled={!hasSupabaseConfig || isSubmitting || manualCode.length === 0} isBlock type="submit" variant="accent">
                {isSubmitting ? 'Validando...' : 'Confirmar check-in'}
              </Button>
            </form>
            {!hasSupabaseConfig ? <small className="form-error">Modo local: configure o Supabase para validar check-ins.</small> : null}
            {errorMessage ? <small className="form-error">{errorMessage}</small> : null}
          </>
        )}
      </div>
    </section>
  )
}
