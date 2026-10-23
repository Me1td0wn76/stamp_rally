package model

import "time"

//----------------------------------------------------------------------
// 特別室の「いまの会場」
//
// 特別室に入った人(入室番号がある人)だけが見られる、会場全体の数字。
// 特別室の画面を開いている間は、画面がときどき取りに来るので、その時刻を覚えておき、
// 最近(secretRoomHere 以内)取りに来た人を「いまこの部屋にいる人」として数える。
// スタンプと同じくメモリに置くだけなので、サーバーを再起動すると消える。
//----------------------------------------------------------------------

// secretRoomHere は「いまこの部屋にいる」と見なす、最後に取りに来てからの時間
// (画面は10秒ごとに取りに来るので、2回くらい取りそこねても数に残る)
const secretRoomHere = 30 * time.Second

// secretRoomSeen は隠し画面ごとの、最後に取りに来た時刻(隠し画面 → ユーザーID → 時刻)。Mu で保護する
// 入れるのは入室番号がある人だけなので、入室番号(secretRoomNos)より増えることはない
var secretRoomSeen = make(map[string]map[string]time.Time)

// SecretRoomLive は GET /api/special-room/live の応答
type SecretRoomLive struct {
	No       int `json:"no"`       // 自分の入室番号
	Entrants int `json:"entrants"` // 特別室に入った人の数
	Here     int `json:"here"`     // いま特別室を開いている人の数(自分も含む)
	Players  int `json:"players"`  // スタンプラリーに参加した人の数(ユーザーIDを発行した数)
	Stamps   int `json:"stamps"`   // 会場全体で押されたスタンプの数
}

// IsSecretRoomEntrant は、userID が room に入った人(入室番号がある人)かを返す
func IsSecretRoomEntrant(userID, room string) bool {
	Mu.Lock()
	defer Mu.Unlock()

	_, ok := secretRoomNos[room][userID]
	return ok
}

// GetSecretRoomLive は、room に入った人(入室番号がある人)に会場の数字を返す。入っていない人は false
// 呼ばれた時刻(now)を、その人がこの部屋にいた時刻として覚える
func GetSecretRoomLive(userID, room string, now time.Time) (SecretRoomLive, bool) {
	// Users は Mu とは別のロック(usersMu)で守られているので、先に数えておく
	players := userCount()

	Mu.Lock()
	defer Mu.Unlock()

	no, ok := secretRoomNos[room][userID]
	if !ok {
		return SecretRoomLive{}, false
	}
	seen := secretRoomSeen[room]
	if seen == nil {
		seen = make(map[string]time.Time)
		secretRoomSeen[room] = seen
	}
	seen[userID] = now

	here := 0
	for _, at := range seen {
		if now.Sub(at) <= secretRoomHere {
			here++
		}
	}
	stamps := 0
	for _, userStamps := range Stamps {
		stamps += len(userStamps)
	}
	return SecretRoomLive{No: no, Entrants: len(secretRoomNos[room]), Here: here, Players: players, Stamps: stamps}, true
}
