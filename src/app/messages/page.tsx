import { redirect } from 'next/navigation';

// The old split-pane polling chat has been retired in favor of the real-time
// Socket.io view under /account/messages. This page now just forwards any traffic
// (including stale `?roomId=` deep links / bookmarks) to the canonical view.
export default async function MessagesRedirect({
  searchParams,
}: {
  searchParams: Promise<{ roomId?: string | string[] }>;
}) {
  const { roomId } = await searchParams;
  const id = Array.isArray(roomId) ? roomId[0] : roomId;
  redirect(id ? `/account/messages/${id}` : '/account/messages');
}
