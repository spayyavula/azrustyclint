import { useEffect, useRef, useState } from 'react'
import { Video, VideoOff, Mic, MicOff, PhoneOff, Phone } from 'lucide-react'
import clsx from 'clsx'

interface VideoChatProps {
  roomId: string
  userId: string
}

export default function VideoChat({ roomId, userId }: VideoChatProps) {
  const [isInCall, setIsInCall] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [peers, setPeers] = useState<string[]>([])

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const startCall = async () => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Connect to signaling server
      const ws = new WebSocket(`ws://${window.location.host}/ws/signaling/${roomId}`)
      wsRef.current = ws

      ws.onopen = () => {
        // Announce joining
        ws.send(JSON.stringify({ type: 'Join', user_id: userId }))
      }

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data)

        switch (message.type) {
          case 'Join':
            // New peer joined, create offer
            if (message.user_id !== userId) {
              await createPeerConnection(message.user_id, true)
            }
            break

          case 'Offer':
            // Received offer, create answer
            if (message.target === userId) {
              await handleOffer(message.user_id, message.sdp)
            }
            break

          case 'Answer':
            // Received answer
            if (message.target === userId) {
              await handleAnswer(message.user_id, message.sdp)
            }
            break

          case 'IceCandidate':
            // Received ICE candidate
            if (message.target === userId) {
              await handleIceCandidate(message.user_id, message.candidate)
            }
            break

          case 'Leave':
            // Peer left
            handlePeerLeft(message.user_id)
            break
        }
      }

      setIsInCall(true)
    } catch (error) {
      console.error('Failed to start call:', error)
    }
  }

  const createPeerConnection = async (peerId: string, createOffer: boolean) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    peerConnectionsRef.current.set(peerId, pc)

    // Add local stream tracks
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!)
    })

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsRef.current?.send(
          JSON.stringify({
            type: 'IceCandidate',
            candidate: event.candidate.candidate,
            target: peerId,
          })
        )
      }
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      // In a full implementation, you'd display this stream
      console.log('Received remote track from', peerId, event.streams)
      setPeers((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]))
    }

    if (createOffer) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      wsRef.current?.send(
        JSON.stringify({
          type: 'Offer',
          sdp: offer.sdp,
          target: peerId,
        })
      )
    }

    return pc
  }

  const handleOffer = async (peerId: string, sdp: string) => {
    const pc = await createPeerConnection(peerId, false)
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }))

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    wsRef.current?.send(
      JSON.stringify({
        type: 'Answer',
        sdp: answer.sdp,
        target: peerId,
      })
    )
  }

  const handleAnswer = async (peerId: string, sdp: string) => {
    const pc = peerConnectionsRef.current.get(peerId)
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }))
    }
  }

  const handleIceCandidate = async (peerId: string, candidate: string) => {
    const pc = peerConnectionsRef.current.get(peerId)
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate({ candidate }))
    }
  }

  const handlePeerLeft = (peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId)
    if (pc) {
      pc.close()
      peerConnectionsRef.current.delete(peerId)
    }
    setPeers((prev) => prev.filter((id) => id !== peerId))
  }

  const endCall = () => {
    // Stop all tracks
    localStreamRef.current?.getTracks().forEach((track) => track.stop())

    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'Leave', user_id: userId }))
      wsRef.current.close()
    }

    setIsInCall(false)
    setPeers([])
  }

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setIsVideoEnabled(videoTrack.enabled)
    }
  }

  const toggleAudio = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setIsAudioEnabled(audioTrack.enabled)
    }
  }

  useEffect(() => {
    return () => {
      endCall()
    }
  }, [])

  if (!isInCall) {
    return (
      <button
        onClick={startCall}
        className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm hover:bg-green-700"
      >
        <Phone size={16} />
        Start Call
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Local video */}
      <div className="relative aspect-video w-48 overflow-hidden rounded-lg bg-black">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
        />
        <div className="absolute bottom-1 left-1 rounded bg-black/50 px-1 text-xs">
          You
        </div>
      </div>

      {/* Peer count */}
      {peers.length > 0 && (
        <div className="text-xs text-gray-400">{peers.length} peer(s) connected</div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={toggleVideo}
          className={clsx(
            'rounded p-2',
            isVideoEnabled ? 'bg-editor-active hover:bg-editor-border' : 'bg-red-600 hover:bg-red-700'
          )}
          title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
        >
          {isVideoEnabled ? <Video size={16} /> : <VideoOff size={16} />}
        </button>
        <button
          onClick={toggleAudio}
          className={clsx(
            'rounded p-2',
            isAudioEnabled ? 'bg-editor-active hover:bg-editor-border' : 'bg-red-600 hover:bg-red-700'
          )}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? <Mic size={16} /> : <MicOff size={16} />}
        </button>
        <button
          onClick={endCall}
          className="rounded bg-red-600 p-2 hover:bg-red-700"
          title="End call"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  )
}
