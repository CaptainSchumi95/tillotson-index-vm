import { useParams } from '@tanstack/react-router'
import { ChatWorkspace } from '@/components/chat/ChatWorkspace'

/** Otvorená konverzácia (/chat/$channelId). */
export function ChatChannelPage() {
  const { channelId } = useParams({ strict: false }) as { channelId: string }
  return <ChatWorkspace activeId={channelId} />
}
