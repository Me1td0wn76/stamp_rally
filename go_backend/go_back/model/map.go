package model

// NFC UID -> SpotID へのマッピング
// 各店舗固有の UID(model.goを参照) をここに登録する
var NfcToSpotMap = map[string]int{
	"04:AB:CD:EF:01": 1,
	"04:AB:CD:EF:02": 2,
	"04:AB:CD:EF:03": 3,
}
