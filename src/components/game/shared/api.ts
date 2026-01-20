import { PlayerProfile } from "./types"

export const playerStorageKey = "plinko.players.v2"
export const configStorageKey = "plinko.config.v1"

// API helpers with localStorage fallback
export async function loadPlayersFromAPI(): Promise<PlayerProfile[] | null> {
  try {
    const response = await fetch("/api/plinko/players")
    if (!response.ok) return null
    const data = await response.json()
    if (data.fallback === true) return null
    return data.players
  } catch {
    return null
  }
}

export async function savePlayersToAPI(players: PlayerProfile[]): Promise<boolean> {
  try {
    const response = await fetch("/api/plinko/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players })
    })
    if (!response.ok) return false
    const data = await response.json()
    return data.fallback !== true && data.success === true
  } catch {
    return false
  }
}

export const makePlayerId = (): string =>
  `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

export const defaultPlayers: PlayerProfile[] = [
  { id: makePlayerId(), name: "Alberto", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U07CS78N83E-75c562954cec-512" },
  { id: makePlayerId(), name: "Cache", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-UJTV9CALF-1f9a6157e910-512" },
  { id: makePlayerId(), name: "Daniel", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U04UZ5RR5RU-6b08814bab5f-512" },
  { id: makePlayerId(), name: "Elizabeth", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U08J7A4HL20-969440ad060f-512" },
  { id: makePlayerId(), name: "Fari", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U04T9PY41P1-d15c814fd4e2-512" },
  { id: makePlayerId(), name: "Jared", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U075CGCJP8V-3dce62562a1a-512" },
  { id: makePlayerId(), name: "Jon", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U02E91B4U66-1b9a90423a90-512" },
  { id: makePlayerId(), name: "Madison", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U026T9FAGQ7-90a4aaa8f62c-512" },
  { id: makePlayerId(), name: "Matt", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U8U5ANCF8-3bfdde800605-512" },
  { id: makePlayerId(), name: "Paul", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U08U8DPR9-03d672ef101c-512" },
  { id: makePlayerId(), name: "RJ", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U0990R1S6-b47fdae676a6-192" },
  { id: makePlayerId(), name: "Sam", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U01DXBN6A3S-8720534b422b-512" },
  { id: makePlayerId(), name: "William", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U0ABCTX5H-g37aa34e7410-192" },
].map(player => ({ ...player, archived: false }))

// Helper to get placeholder avatar URL
export const getAvatarUrl = (player: PlayerProfile): string => {
  if (player.avatarUrl != null && player.avatarUrl.trim() !== "") return player.avatarUrl
  // Use DiceBear API for placeholder avatars
  const seed = encodeURIComponent(player.name || player.id)
  return `https://api.dicebear.com/7.x/bottts-neutral/png?seed=${seed}&size=48`
}
