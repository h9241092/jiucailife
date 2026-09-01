export type Risk = "safe" | "steady" | "bold";
export type Action = "invest" | "learn" | "work" | "family" | "wait" | "hold" | "reduce" | "buy" | "sell";
export type EventKind = "tech" | "market" | "crypto" | "housing" | "career" | "macro" | "meme";
export type MarketDirection = "bullish" | "bearish";
export type IntelChoiceEffects = { cash?: number; knowledge: number; stress: number; health?: number; credit?: number };
export type EventLensEffect = {
  label: string;
  detail: string;
  signalStrengthMultiplier: number;
  primaryDurationBonusMonths: number;
  readAccuracyModifiers: Record<"research" | "observe" | "trend", number>;
  trendCashMultiplier?: number;
  trendKnowledgeDelta?: number;
};

export type Choice = {
  label: string;
  desc: string;
  action: Action;
  risk: Risk;
  minR: number;
  ratio?: number;
  asset?: { category: string; name: string };
  positionId?: string;
  intelAction?: "research" | "observe" | "trend";
  intelEffects?: IntelChoiceEffects;
};

export type GameEvent = {
  id: string;
  topicId: string;
  historicalYear: number;
  topic: string;
  kind: EventKind;
  lensIndex: number;
  lensEffect: EventLensEffect;
  tag: string;
  title: string;
  body: string;
  quote: string;
  source: string;
  marketDirection: MarketDirection;
  linkedAsset: { category: string; name: string };
  choices: Choice[];
};

type Moment = {
  year: number;
  topic: string;
  headline: string;
  context: string;
  meme: string;
  kind: EventKind;
  asset: { category: string; name: string };
};

// 61 個台灣 2016–2026 時事、全球總經與網路文化主題。遊戲採戲仿名稱，避免把事件寫成投資建議。
const moments: Moment[] = [
  { year: 2016, topic: "抓寶經濟", headline: "全台灣突然開始低頭走路，公園變成半夜交易所", context: "手機抓寶遊戲登台後，人潮、商圈與行動電源一起爆量，擴增實境第一次走進全民生活。", meme: "前面有稀有怪，先不要管明天上班", kind: "tech", asset: { category: "台股", name: "低頭抓寶概念股" } },
  { year: 2016, topic: "一例一休", headline: "新的工時規則上路，老闆與員工開始用不同算法算加班", context: "勞動制度改變牽動排班、人事成本與服務業營運，所有人都說自己才是被影響最大的一方。", meme: "你的休假，是別人的成本", kind: "career", asset: { category: "台股", name: "自動排班科技" } },
  { year: 2016, topic: "AlphaGo震撼", headline: "人工智慧擊敗世界棋王，老AI第一次走出實驗室登上財經版", context: "AlphaGo的勝利讓全球重新估算人工智慧、運算晶片與資料中心的長期需求，台灣電子供應鏈也開始替下一波算力投資暖身。", meme: "當年AI先下棋，後來開始替投資人下單", kind: "tech", asset: { category: "台股", name: "老AI解套聯盟" } },
  { year: 2016, topic: "衛星訂單延後", headline: "衛星專案延後交付，低鬼衛星的資金缺口被市場放大", context: "專案驗收延後與高利率同時壓縮現金流，市場重新估算衛星公司的融資成本與增資稀釋風險。", meme: "衛星還沒升空，股本先膨脹", kind: "market", asset: { category: "台股", name: "低鬼衛星" } },
  { year: 2016, topic: "英國脫歐震撼", headline: "英國公投選擇離開歐盟，歐洲股市與跨國企業一起重算未來", context: "脫歐公投讓跨境貿易、歐洲銀行與企業布局劇烈波動，台灣出口商也得重新評估歐洲訂單。", meme: "說走就走，供應鏈先跌一跤", kind: "macro", asset: { category: "ETF", name: "歐洲退群避震ETF" } },
  { year: 2016, topic: "川普勝選交易", headline: "紅帽商人意外入主白宮，基建、減稅與貿易政策同時開盤", context: "川普勝選後，市場押注減稅、基礎建設與美國優先政策，台灣供應鏈開始學會盯推文做風控。", meme: "選票開完，期貨還沒冷靜", kind: "macro", asset: { category: "美股", name: "紅帽美國優先組合" } },

  { year: 2017, topic: "台股萬點", headline: "加權指數睽違多年重返萬點，財經台開始倒數煙火", context: "權值股、景氣復甦與資金行情把台股推回五位數，市場重新討論這次能站多久。", meme: "萬點不是終點，是聊天室的起點", kind: "market", asset: { category: "台股", name: "萬點紀念指數" } },
  { year: 2017, topic: "815大停電", headline: "全台大停電，大家同時發現電力比Wi‑Fi更基本", context: "八一五停電衝擊家庭與產線，能源安全、備援系統與停工損失瞬間成為投資題材。", meme: "先別看盤，盤也看不到", kind: "macro", asset: { category: "台股", name: "永不斷電能源" } },
  { year: 2017, topic: "蘋果十週年機", headline: "瀏海手機亮相，台灣供應鏈跟著接受全球放大鏡", context: "新一代高階手機帶動鏡頭、面板、晶片與組裝題材，分析師開始拆解每一顆螺絲值多少錢。", meme: "手機很貴，信仰無價", kind: "tech", asset: { category: "美股", name: "水果信仰" } },
  { year: 2017, topic: "第一次幣圈狂熱", headline: "比特幣衝上新聞首頁，連早餐店都有人討論挖礦", context: "加密貨幣首波全民狂熱帶動顯卡、礦機與交易所，錢包私鑰卻沒多少人真正看懂。", meme: "不是泡沫，是去中心化的未來", kind: "crypto", asset: { category: "加密貨幣", name: "初代登月幣" } },
  { year: 2017, topic: "美國退出TPP", headline: "川普上任就退出跨太平洋夥伴協定，亞太貿易劇本整本重寫", context: "美國退出TPP並轉向雙邊談判，台灣出口產業重新估算關稅、區域整合與供應鏈位置。", meme: "群組才剛加入，管理員先退群", kind: "macro", asset: { category: "ETF", name: "亞太退群重組ETF" } },
  { year: 2017, topic: "川普減稅行情", headline: "美國通過大規模稅改，企業獲利預估像收到年底紅包", context: "美國稅改改變企業稅負、資本配置與跨國公司的投資計畫，美股獲利預期同步重估。", meme: "公司先減稅，股東先加戲", kind: "market", asset: { category: "美股", name: "大而有感減稅股" } },

  { year: 2018, topic: "半導體交棒", headline: "晶圓代工教父退休，市場第一次學著想像沒有他的明天", context: "張忠謀退休象徵台灣半導體世代交棒，公司治理、接班與先進製程成為長期焦點。", meme: "山還在，掌舵的人換了", kind: "tech", asset: { category: "台股", name: "護國神積" } },
  { year: 2018, topic: "美中貿易戰", headline: "兩大經濟體互加關稅，台灣供應鏈開始搬動世界地圖", context: "美中貿易摩擦升溫，電子、機械與傳產訂單重新洗牌，轉單與斷鏈同時成為關鍵字。", meme: "別人打架，供應鏈先加班", kind: "macro", asset: { category: "ETF", name: "供應鏈搬家ETF" } },
  { year: 2018, topic: "最長萬點", headline: "台股在萬點之上住到像設了戶籍，投資人開始習慣高處", context: "台股創下長時間站穩萬點的紀錄，高殖利率、權值股與國際資金支撐市場信心。", meme: "萬點之上，人人都是長期投資", kind: "market", asset: { category: "ETF", name: "高處不勝寒ETF" } },
  { year: 2018, topic: "被動元件缺貨漲價", headline: "MLCC供不應求連番漲價，被動元件股比產品名稱更主動", context: "車用與消費電子需求擠壓產能，交期拉長與價格調升推高台廠獲利，也讓市場開始擔心擴產後的循環反轉。", meme: "元件很被動，報價單很主動", kind: "market", asset: { category: "台股", name: "被動元件漲價王" } },
  { year: 2018, topic: "聯準會連續升息", headline: "聯準會一年四度升息，便宜資金開始收回市場的派對手環", context: "美國利率升至金融海嘯後高檔，資金緊縮壓迫高估值與新興市場，也放大年底股市震盪。", meme: "酒還沒喝完，央行先開燈", kind: "macro", asset: { category: "ETF", name: "升息抽水防守ETF" } },

  { year: 2019, topic: "台商回流", headline: "工廠與訂單開始回台，工業區旁的便當店先感受到景氣", context: "美中摩擦促使台商回流與產能移轉，資通訊出口、土地與缺工議題一起升溫。", meme: "鮭魚回鄉，土地先漲", kind: "macro", asset: { category: "台股", name: "鮭魚回流供應鏈" } },
  { year: 2019, topic: "外送經濟", headline: "粉紅與綠色外送箱塞滿街頭，午餐正式平台化", context: "外送平台快速擴張，餐飲業、零工經濟與平台抽成改變城市消費習慣。", meme: "下雨天，是訂單也是職災", kind: "career", asset: { category: "美股", name: "水龍頭成長股" } },
  { year: 2019, topic: "5G與先進製程", headline: "大家還沒換5G手機，供應鏈已經先把明年營收算進去", context: "5G商用與先進製程投資升溫，基地台、晶片與高速傳輸成為新一輪科技題材。", meme: "速度還沒感受到，股價先連線", kind: "tech", asset: { category: "台股", name: "五告快通訊" } },
  { year: 2019, topic: "台灣芭樂輸美", headline: "台灣芭樂敲開美國市場，農產品也有自己的國際掛牌日", context: "歷經多年檢疫談判，台灣芭樂獲准輸美，農業技術、冷鏈與品牌出口受到關注。", meme: "這顆芭樂有國際觀", kind: "macro", asset: { category: "台股", name: "水果外銷冷鏈" } },
  { year: 2019, topic: "華為實體清單", headline: "川普政府把中國電信巨頭列入管制清單，晶片供應鏈瞬間選邊站", context: "美國出口管制擴及華為與相關企業，台灣晶圓代工、IC設計與設備商開始面對科技戰的新邊界。", meme: "不是斷訊，是供應鏈被已讀", kind: "tech", asset: { category: "台股", name: "科技選邊供應鏈" } },
  { year: 2019, topic: "聯準會預防性降息", headline: "貿易緊張拖慢景氣，聯準會十多年來首度降息替市場買保險", context: "全球成長疑慮與低通膨促使美國轉向降息，債券、成長股與企業融資預期迅速換邊。", meme: "不是衰退，只是先把傘打開", kind: "macro", asset: { category: "ETF", name: "央行保險債券ETF" } },

  { year: 2020, topic: "口罩實名制", headline: "藥局門口開始排隊，口罩變成最硬的生活通貨", context: "疫情初期口罩實名制上路，工具機國家隊、藥局與數位系統共同撐起新日常。", meme: "有口罩，才有出門的多頭部位", kind: "macro", asset: { category: "台股", name: "國家隊防疫供應鏈" } },
  { year: 2020, topic: "全球熔斷", headline: "美股一週熔斷到課本來不及改版，台股也跟著自由落體", context: "全球疫情引爆金融恐慌，股市與信用市場急凍，現金第一次看起來如此有魅力。", meme: "見證歷史，然後歷史又來一次", kind: "market", asset: { category: "ETF", name: "全球熔斷避震ETF" } },
  { year: 2020, topic: "負油價", headline: "國際油價跌到負數，買到便宜的人卻不一定笑得出來", context: "需求崩跌與儲油空間不足造成史上罕見負油價，原油槓桿商品也讓許多投資人重新學習轉倉。", meme: "油送你，桶子自己準備", kind: "market", asset: { category: "期貨", name: "負油價紀念桶" } },
  { year: 2020, topic: "盤中零股", headline: "一張買不起沒關係，台股正式進入一股也能當股東的時代", context: "盤中零股交易上線，小資族能在交易時間買進高價股，投資門檻與社群參與度一起下降。", meme: "買不起一張，也能擁有一股信仰", kind: "market", asset: { category: "ETF", name: "小資一股入魂" } },
  { year: 2020, topic: "宅經濟", headline: "辦公室搬進客廳，鏡頭、美食外送與視訊軟體一起缺貨", context: "居家工作與遠距上課推升筆電、網路、電商與物流需求，生活和工作失去清楚邊界。", meme: "你不是在家，是住在公司", kind: "career", asset: { category: "美股", name: "永遠在線雲會議" } },
  { year: 2020, topic: "零利率與無限水龍頭", headline: "聯準會把利率壓到接近零，資產購買像打開看不到底的水龍頭", context: "疫情衝擊下，美國快速降息並擴大資產購買，現金、債券與高估值科技股的定價規則全面改寫。", meme: "基本面還在隔離，資金先出院", kind: "macro", asset: { category: "美股", name: "水龍頭成長股" } },

  { year: 2021, topic: "三級警戒", headline: "雙北街頭突然安靜，股市卻在家裡變得更吵", context: "本土疫情升溫、全台進入三級警戒，餐飲觀光受衝擊，宅經濟與遠距需求再度升溫。", meme: "人不出門，錢還是在跑", kind: "macro", asset: { category: "ETF", name: "三級警戒宅經濟" } },
  { year: 2021, topic: "航運三雄", headline: "貨櫃塞港、運價噴出，船票比機票更像財富密碼", context: "全球供應鏈壅塞推升貨櫃運價，航運股成交火熱，水手、下船與畢業照成為股民共同語言。", meme: "長榮海上，水手不要下船", kind: "market", asset: { category: "台股", name: "貨櫃三雄聯盟" } },
  { year: 2021, topic: "晶片荒", headline: "汽車等不到晶片，世界終於發現護國神山不是比喻", context: "疫情與需求錯配造成全球晶片短缺，車用、消費電子與成熟製程產能成為國際焦點。", meme: "缺的不是車，是那一小片矽", kind: "tech", asset: { category: "台股", name: "成熟製程缺貨王" } },
  { year: 2021, topic: "五月大停電", headline: "短時間兩次大停電，冰箱和晶圓廠一起做壓力測試", context: "五月供電事故引發分區停電，能源韌性、儲能與產業備援再次成為熱門議題。", meme: "停電不可怕，沒存檔才可怕", kind: "macro", asset: { category: "台股", name: "備援儲能國家隊" } },
  { year: 2021, topic: "迷因股", headline: "美國散戶抱團對抗放空機構，台灣鄉民隔海喊鑽石手", context: "GameStop等迷因股劇烈震盪，社群動員、軋空與券商限制交易引發全球討論。", meme: "不是股票，是一場運動", kind: "meme", asset: { category: "美股", name: "遊戲不停迷因股" } },
  { year: 2021, topic: "台股萬八行情", headline: "台股首度站上一萬八千點，權值股與散戶資金一起把天花板抬高", context: "低利率、出口成長與電子權值股推升指數創高，融資水位和本益比也讓追價風險同步升溫。", meme: "萬八不是酒，是大家都喝醉的指數", kind: "market", asset: { category: "ETF", name: "萬八高檔大盤ETF" } },

  { year: 2022, topic: "戰爭與通膨", headline: "戰火推升能源與糧價，早餐店老闆比央行更早宣布升息", context: "俄烏戰爭加劇能源、原物料與糧食壓力，通膨從財經名詞變成每天的帳單。", meme: "萬物皆漲，只有薪水盤整", kind: "macro", asset: { category: "ETF", name: "萬物皆漲原物料" } },
  { year: 2022, topic: "升息熊市", headline: "聯準會快速升息，成長股從夢想折現回今天", context: "全球央行為抑制通膨升息，台股從高點回落，國安基金進場與資金緊縮成為焦點。", meme: "利率一升，夢想就要打折", kind: "market", asset: { category: "美股", name: "升息抗震價值股" } },
  { year: 2022, topic: "幣圈連環爆", headline: "穩定幣不穩、交易所不交代，幣圈開始清算信仰", context: "Luna與FTX等事件重創加密市場，託管、槓桿與資產透明度成為血淋淋的必修課。", meme: "幣還在鏈上，老闆先不在", kind: "crypto", asset: { category: "加密貨幣", name: "真的穩定幣" } },
  { year: 2022, topic: "高利率融資壓力", headline: "降息預期延後，衛星公司與投行一起重算資金成本", context: "高利率拉高長期融資成本，資本支出龐大的低軌衛星題材與投行承銷交易同步承壓。", meme: "衛星還在天上，融資成本先升空", kind: "market", asset: { category: "台股", name: "低鬼衛星" } },
  { year: 2022, topic: "303大停電", headline: "全台再度大停電，手機剩餘電量成為真正的恐慌指數", context: "興達電廠事故造成大規模停電，電網韌性、能源配置與企業備援再次被檢視。", meme: "滿手電子股，家裡沒有電子", kind: "macro", asset: { category: "台股", name: "電網韌性升級" } },

  { year: 2023, topic: "生成式AI", headline: "聊天機器人突然會寫報告，所有公司一夜之間都說自己是AI", context: "生成式AI快速普及，伺服器、晶片、散熱與軟體題材席捲台股與職場。", meme: "不會被AI取代，會被會用AI的人取代", kind: "tech", asset: { category: "台股", name: "什麼都AI伺服器" } },
  { year: 2023, topic: "皮衣教主旋風", headline: "AI晶片執行長逛夜市，攤商與供應鏈一起上新聞", context: "黃仁勳訪台帶動AI供應鏈關注，夜市行程甚至成為另類概念股地圖。", meme: "皮衣一穿，算力上山", kind: "tech", asset: { category: "美股", name: "皮衣算力" } },
  { year: 2023, topic: "全台蛋荒", headline: "超市蛋架空空，早餐店加蛋第一次像期貨報價", context: "禽流感、氣候與供應調度造成蛋價與缺蛋議題，農業政策和民生物價成為焦點。", meme: "加蛋十五，財富自由再等等", kind: "macro", asset: { category: "台股", name: "金雞下蛋農業" } },
  { year: 2023, topic: "新青安", headline: "四十年房貸把月付變小，也把人生拉得很長", context: "新青安優惠貸款上路後帶動首購與房市熱度，寬限期、總價與負擔能力引發爭論。", meme: "先求有，再繳四十年", kind: "housing", asset: { category: "房地產", name: "四十年夢想宅" } },
  { year: 2023, topic: "山道猴子", headline: "一部動畫讓全台重新討論貸款、面子與機車改裝", context: "《山道猴子的一生》以黑色幽默描繪青年財務與社群壓力，成為年度現象級話題。", meme: "其實我也可以過得很好", kind: "meme", asset: { category: "台股", name: "二手重機信仰" } },

  { year: 2024, topic: "台股兩萬點", headline: "台股突破兩萬點，辦公室裡突然多了很多總經專家", context: "AI熱潮與權值股推動指數創高，市場市值、ETF與全民開戶熱度同步上升。", meme: "兩萬點不高，套牢的人才恐高", kind: "market", asset: { category: "ETF", name: "兩萬點紀念ETF" } },
  { year: 2024, topic: "00940之亂", headline: "一萬元高股息ETF募集，銀行門口像在發限量球鞋", context: "高股息ETF募集規模創紀錄，解定存、借錢申購與月配息迷思引發市場熱議。", meme: "巨嬰還沒上市，大家先認親", kind: "market", asset: { category: "ETF", name: "韭韭價值高息" } },
  { year: 2024, topic: "0403花蓮地震", headline: "強震搖動全台，晶圓廠與每個家庭同時確認平安", context: "花蓮強震造成重大災情，也讓企業營運持續、供應鏈備援與保險保障受到關注。", meme: "先確認人，再確認盤", kind: "macro", asset: { category: "台股", name: "耐震營建更新" } },
  { year: 2024, topic: "八月股災", headline: "台股單日重挫刷新紀錄，畢業照來不及排版", context: "全球科技股回檔與槓桿套利交易逆轉引發劇烈賣壓，投資人面臨快速追繳。", meme: "早上抄底，下午變地基", kind: "market", asset: { category: "期貨", name: "八月速度與激情" } },
  { year: 2024, topic: "台積電千金行情", headline: "護國神山股價首度跨過千元，零股交易正式成為小資登山口", context: "AI需求與先進製程推升獲利預期，權值股創高也放大台股指數集中度與單一公司風險。", meme: "一張買不起，一股也算登頂", kind: "tech", asset: { category: "台股", name: "千金護國神積" } },
  { year: 2024, topic: "美國商辦貸款警報", headline: "高利率撞上空辦公室，商用不動產貸款開始拉警報", context: "遠距工作改變辦公需求，商辦估值下修與再融資壓力一路傳到區域銀行和不動產基金。", meme: "辦公室沒人，貸款每天都準時上班", kind: "housing", asset: { category: "房地產", name: "空辦公室警報宅" } },

  { year: 2025, topic: "DeepSeek震撼", headline: "低成本AI模型震撼市場，算力信仰第一次被要求出示收據", context: "中國AI模型DeepSeek引發全球科技股波動，市場重新估算晶片需求、效率與護城河。", meme: "算力很貴，推理可以便宜一點", kind: "tech", asset: { category: "美股", name: "深度求索AI" } },
  { year: 2025, topic: "關稅震撼", headline: "美國新關稅清單公布，台灣出口商整夜重算報價", context: "美國關稅政策帶來高度不確定性，電子、傳產與供應鏈布局同步震盪。", meme: "關稅是別人宣布，成本是大家吸收", kind: "macro", asset: { category: "ETF", name: "00九八2欸" } },
  { year: 2025, topic: "AI伺服器出口", headline: "AI伺服器訂單爆發，台灣出口數字像裝了液冷散熱", context: "雲端業者擴大AI基礎建設，台灣伺服器、先進封裝與零組件供應鏈持續受惠。", meme: "機房很熱，營收更熱", kind: "tech", asset: { category: "台股", name: "液冷伺服器聯盟" } },
  { year: 2025, topic: "黃金歷史高價", headline: "金價連創新高，央行買盤與地緣風險把避險資產推上鎂光燈", context: "利率預期、官方儲備與避險需求共同支撐黃金，追高投資人也面臨無現金流與劇烈回檔風險。", meme: "別人買金飾，我買的是總經焦慮", kind: "market", asset: { category: "期貨", name: "閃亮避險黃金期貨" } },
  { year: 2025, topic: "對等關稅暫停鍵", headline: "川普公布對等關稅又按下九十天暫停，全球股市被政策甩尾", context: "關稅稅率、報復措施與談判進度快速變動，出口商無法只做一套報價，投資人也開始替每則聲明標波動率。", meme: "昨天全面開徵，今天先等等看", kind: "macro", asset: { category: "ETF", name: "關稅談判避震ETF" } },
  { year: 2025, topic: "大而美減稅法案", headline: "川普把減稅與支出包成大而美法案，債券市場先拿計算機", context: "大型稅收與支出法案改變企業投資、財政赤字與國債供給預期，美股歡呼時長天期利率未必配合。", meme: "名字很大很美，利息也很具體", kind: "macro", asset: { category: "美股", name: "大而美財政派對" } },

  { year: 2026, topic: "台美關稅協議", headline: "台美關稅降至新框架，企業投資承諾成為市場新算式", context: "台美經貿協議降低關稅不確定性，同時伴隨半導體與AI相關赴美投資承諾。", meme: "稅率降了，資本支出上了", kind: "macro", asset: { category: "ETF", name: "台美供應鏈再平衡" } },
  { year: 2026, topic: "AI帶動高成長", headline: "AI出口推升經濟成長，主計數字比多數人的加薪更有感", context: "AI硬體需求帶動台灣出口與投資，但產業集中、泡沫風險與民間體感仍受討論。", meme: "GDP很會漲，我的薪水比較害羞", kind: "tech", asset: { category: "台股", name: "AI出口國家隊" } },
  { year: 2026, topic: "房貸管制微調", headline: "第二戶貸款成數微調，房仲群組比央行新聞稿更早歡呼", context: "房市降溫後，央行調整第二戶貸款成數上限，信用管制與自住需求再次拉鋸。", meme: "不是鬆綁，是把腰帶放一格", kind: "housing", asset: { category: "房地產", name: "第二戶喘息宅" } },
  { year: 2026, topic: "AI資本支出折舊壓力", headline: "科技巨頭持續砸錢蓋算力，市場開始追問每一張晶片何時回本", context: "資料中心投資推升營收與供應鏈需求，但折舊、電力與融資成本也逐步侵蝕自由現金流。", meme: "算力是資產，折舊是鬧鐘", kind: "tech", asset: { category: "美股", name: "算力折舊科技巨頭" } },
];

// 再補上 64 個不同的總經、產業、政策與迷因主題；下方會經關聯性審查後取用 100 個主題。
const supplementalMoments: Moment[] = [
  { year: 2016, topic: "台南強震與耐震題材", headline: "南台灣強震撼動住宅與產線，耐震不再只是建案廣告的小字", context: "災後重建讓建築安全、土壤液化、保險與企業備援成為全民課題，營建供應鏈也迎來重新檢視。", meme: "房子會增值，結構要先撐得住", kind: "housing", asset: { category: "台股", name: "節能設備受惠鏈" } },
  { year: 2016, topic: "兆豐洗錢裁罰", headline: "台灣銀行在紐約挨下巨額裁罰，法遵部門一夕從成本中心變主角", context: "海外監管裁罰讓金融業重新投入反洗錢與客戶審查，銀行獲利之外多了一張昂貴的合規帳單。", meme: "客戶要KYC，銀行也要做人檢查", kind: "market", asset: { category: "台股", name: "洗好再匯金融控股" } },
  { year: 2016, topic: "手機電池召回", headline: "旗艦手機接連冒煙停產，供應鏈第一次被電池熱到上頭條", context: "全球大規模召回衝擊品牌、電池與零組件供應商，品質管理與產品責任成為科技股的風險溢價。", meme: "這不是快充，是快速退貨", kind: "tech", asset: { category: "美股", name: "永不冒煙手機" } },
  { year: 2016, topic: "叫車平台罰單戰", headline: "手機叫車越來越方便，平台與監管卻在街頭互相按喇叭", context: "共享經濟挑戰既有計程車規則，稅籍、保險與勞動關係成為平台成長必須補交的作業。", meme: "車到了，法規還在路上", kind: "career", asset: { category: "美股", name: "合法上路叫車網" } },
  { year: 2016, topic: "原物料落底反彈", headline: "油價與金屬從谷底反彈，沉睡的景氣循環股突然伸懶腰", context: "供給調整與全球需求預期改善帶動原物料價格回升，礦業、鋼鐵與航運重新出現在法人報告封面。", meme: "景氣循環沒有死，只是睡很熟", kind: "macro", asset: { category: "ETF", name: "原料甦醒循環ETF" } },
  { year: 2016, topic: "聯準會年底升息", headline: "聯準會年底升息一碼，全球資金在耶誕節前重新排座位", context: "美國就業與通膨回穩推動升息，企業融資、新興市場資金與高估值資產同步受到影響。", meme: "聖誕老人送的不是禮物，是一碼", kind: "macro", asset: { category: "ETF", name: "年底升息過節ETF" } },

  { year: 2017, topic: "財經台老師喊明牌", headline: "老師拍桌喊買，跑馬燈比風險揭露更醒目", context: "財經節目用強烈話術包裝個股，觀眾卻難以核對老師的持倉、成本與利益衝突。", meme: "今天不買，明天只能幫老師抬轎", kind: "market", asset: { category: "台股", name: "老師拍桌明牌股" } },
  { year: 2017, topic: "WannaCry勒索病毒", headline: "全球電腦同時跳出勒索訊息，備份硬碟突然比黃金更珍貴", context: "勒索病毒癱瘓企業與公共系統，資安預算、軟體更新與營運中斷風險進入董事會議程。", meme: "檔案被加密，老闆的臉先解密", kind: "tech", asset: { category: "美股", name: "不哭資安防線" } },
  { year: 2017, topic: "北韓飛彈恐慌", headline: "飛彈試射讓亞洲市場拉警報，黃金與軍工類股又被請回避險席", context: "地緣政治緊張推高短線波動，軍工、能源與避險資產上漲，出口供應鏈則擔心風險擴散。", meme: "盤前看期貨，盤中看飛彈", kind: "macro", asset: { category: "ETF", name: "東北亞避險傘ETF" } },
  { year: 2017, topic: "鴻海威州投資案", headline: "電子代工巨頭宣布赴威州投資，補貼、就業與面板夢一次開得很大", context: "大型海外投資承諾推升市場想像，也讓資本支出、政策補貼與實際產能落地風險成為估值焦點。", meme: "簡報裡是大工廠，財報裡要等驗收", kind: "tech", asset: { category: "台股", name: "威州面板大夢" } },
  { year: 2017, topic: "當沖證交稅減半", headline: "台股當沖稅率減半，短線成交量像解除限速", context: "交易成本下降吸引短線資金，券商手續費與市場流動性受惠，投資人承擔的價格風險卻沒有打折。", meme: "稅少一半，手速要快一倍", kind: "market", asset: { category: "台股", name: "低鬼衛星" } },
  { year: 2017, topic: "聯準會啟動縮表", headline: "聯準會開始縮減資產負債表，市場第一次聽見資金退潮的腳步聲", context: "金融海嘯後累積的債券部位逐步到期不再全數投入，利率與風險資產估值面臨新的流動性環境。", meme: "沒有升息也能抽水，央行很會", kind: "macro", asset: { category: "ETF", name: "縮表退潮防守ETF" } },

  { year: 2018, topic: "0206花蓮強震", headline: "花蓮深夜強震造成災情，觀光與營建同時面對漫長修復", context: "地震衝擊旅宿、交通與住宅安全，保險覆蓋率、耐震補強和地方經濟韌性再次受到關注。", meme: "先報平安，再看訂房取消率", kind: "housing", asset: { category: "台股", name: "花東韌性重建" } },
  { year: 2018, topic: "臉書資料醜聞", headline: "社群巨頭被揭露個資遭濫用，免費服務的真正價格終於浮上桌面", context: "劍橋分析事件引發全球監管與用戶信任危機，廣告科技、資料治理與平台責任進入估值模型。", meme: "產品免費，因為產品可能是你", kind: "tech", asset: { category: "美股", name: "有臉資料廣告網" } },
  { year: 2018, topic: "GDPR上路", headline: "歐洲個資規則正式生效，全球網站同時請你接受餅乾", context: "嚴格資料保護規範提高跨國企業合規成本，也催生隱私科技、資安與資料治理需求。", meme: "我接受餅乾，但沒看內容", kind: "tech", asset: { category: "ETF", name: "隱私餅乾合規ETF" } },
  { year: 2018, topic: "科技股年底重挫", headline: "美股科技巨頭集體回檔，成長故事在年底接受估值壓力測試", context: "升息、貿易摩擦與獲利疑慮讓高估值科技股快速修正，市場重新比較成長速度與實際現金流。", meme: "聖誕行情沒來，估值先放寒假", kind: "market", asset: { category: "美股", name: "年底科技修正股" } },
  { year: 2018, topic: "衛生紙之亂", headline: "漲價傳言讓賣場衛生紙被掃空，民生用品第一次跑贏大盤成交量", context: "原物料成本與預期心理觸發搶購，零售庫存、定價策略和群眾行為成為一場全民實驗。", meme: "別人囤股票，我囤三層", kind: "meme", asset: { category: "台股", name: "三層防禦紙業" } },
  { year: 2018, topic: "行動支付戰國", headline: "每家銀行與平台都發回饋金，付款前先算哪個QR Code最划算", context: "行動支付補貼大戰改變消費習慣，通路黏著、支付資料與燒錢換市占成為金融科技焦點。", meme: "回饋百分之十，前提是記得領券", kind: "market", asset: { category: "台股", name: "掃碼回饋金控" } },

  { year: 2019, topic: "香港反送中衝擊", headline: "香港街頭抗爭延燒，亞洲金融中心的風險溢價被重新報價", context: "政治衝突影響旅遊、零售與資金流向，台灣金融與房市也討論人才和資金移轉效應。", meme: "資金沒有立場，但很會找出口", kind: "macro", asset: { category: "ETF", name: "亞洲資金轉向ETF" } },
  { year: 2019, topic: "美國回購市場吃緊", headline: "隔夜資金利率突然飆升，聯準會半夜替金融水管加壓", context: "短期資金市場失衡迫使央行注入流動性，銀行準備金與金融系統 plumbing 成為市場新單字。", meme: "水管堵住，股市先問誰有通樂", kind: "macro", asset: { category: "ETF", name: "隔夜水管流動性ETF" } },
  { year: 2019, topic: "美債殖利率倒掛", headline: "短天期美債利率高過長天期，殖利率曲線開始替景氣拉警報", context: "貿易摩擦與成長疑慮推升避險需求，銀行利差、債券價格與衰退機率成為全球市場焦點。", meme: "曲線倒過來，大家的胃也翻過來", kind: "macro", asset: { category: "ETF", name: "殖利率倒掛長債ETF" } },
  { year: 2019, topic: "非洲豬瘟邊境戰", headline: "一塊肉品讓機場檢疫全面升級，養豬產業守住國境線", context: "疫情威脅推升檢疫、飼料與肉品價格風險，食品供應鏈開始計算生物安全的價值。", meme: "肉鬆別帶，罰單會飛", kind: "macro", asset: { category: "台股", name: "國境防疫食品鏈" } },
  { year: 2019, topic: "付費會員群投顧", headline: "老師把明牌鎖進群組，會員每天等一句進出場", context: "付費投資群組用勝率截圖與限時話術吸引訂閱，停損與失敗紀錄卻很少被置頂。", meme: "老師的成本價，永遠比你的低", kind: "meme", asset: { category: "台股", name: "老師會員群概念股" } },
  { year: 2019, topic: "台股重返一萬二", headline: "台股睽違多年站上一萬二，權值股把歷史高點變成路標", context: "半導體、台商回流與國際資金推升指數，投資人重新討論高點究竟是風險還是新地板。", meme: "一萬二到了，我的個股還在塞車", kind: "market", asset: { category: "ETF", name: "萬二回歸紀念ETF" } },

  { year: 2020, topic: "振興三倍券", headline: "政府發三倍券刺激消費，大家先研究怎麼把回饋疊到最高", context: "疫情後振興方案帶動零售、餐飲與數位支付，乘數效果也成為全民算術題。", meme: "花一千變三千，再刷卡變更多", kind: "macro", asset: { category: "台股", name: "三倍振興內需股" } },
  { year: 2020, topic: "台積電宣布赴美設廠", headline: "護國神山宣布前進亞利桑那，晶圓廠開始跨洋搬家", context: "海外製造布局牽動成本、人才與地緣政治，台灣半導體聚落的競爭優勢也被重新估算。", meme: "山沒有搬走，只是海外多一座丘陵", kind: "tech", asset: { category: "台股", name: "神山海外分店" } },
  { year: 2020, topic: "疫苗競賽", headline: "全球藥廠搶著公布試驗數據，一個百分比就能讓市場翻紅", context: "疫苗研發速度與冷鏈需求改變疫情終點預期，生技、航空與宅經濟類股隨消息劇烈輪動。", meme: "三期數據一出，套房先退租", kind: "market", asset: { category: "美股", name: "高速疫苗實驗室" } },
  { year: 2020, topic: "電動車拆股狂熱", headline: "電動車龍頭宣布拆股，小股東把價格變小誤認為價值變便宜", context: "電動車成長敘事與拆股效應推高交易熱度，電池、晶片與自駕供應鏈全面被重新定價。", meme: "披薩切五片，不代表多四個披薩", kind: "tech", asset: { category: "美股", name: "特會漲電動車" } },
  { year: 2020, topic: "TikTok禁令風波", headline: "川普政府揚言封禁短影音平台，年輕人的舞蹈突然變成國安議題", context: "資料安全與科技主權衝突延伸到消費平台，廣告、雲端與應用程式商店被迫選邊。", meme: "影片只有十五秒，政策反轉更快", kind: "tech", asset: { category: "美股", name: "抖一下短影音" } },
  { year: 2020, topic: "美國大選開票震盪", headline: "川普與拜登開票拉鋸，期貨市場比選務中心更早熬夜", context: "選舉結果、財政刺激與產業政策預期反覆切換，科技、能源與醫療類股各自押注不同劇本。", meme: "票還在數，部位已經選邊", kind: "macro", asset: { category: "美股", name: "白宮政策輪動股" } },

  { year: 2021, topic: "航海王老師帶會員上船", headline: "老師直播帶會員上船，聊天室只剩水手與畢業照", context: "航運行情吸引散戶與投顧節目追逐，報明牌、會員價與停利紀律一起接受波動考驗。", meme: "老師還在船上，只是鏡頭先關了", kind: "market", asset: { category: "台股", name: "老師航海會員股" } },
  { year: 2021, topic: "蘇伊士運河塞船", headline: "一艘巨輪卡住全球航道，挖土機成了世界經濟的希望", context: "運河阻塞延誤航運與供應鏈，運價、保險和即時庫存模式再次接受壓力測試。", meme: "世界貿易很大，卡船的地方很窄", kind: "macro", asset: { category: "期貨", name: "大排長榮航運期貨" } },
  { year: 2021, topic: "Archegos爆倉", headline: "神祕家族辦公室槓桿爆倉，投資銀行排隊認列學費", context: "總報酬交換與集中持股引發連鎖拋售，場外衍生品透明度和券商風控受到檢討。", meme: "不是家族理財，是家族一起追繳", kind: "market", asset: { category: "美股", name: "投行風控金融股" } },
  { year: 2021, topic: "NFT頭像狂熱", headline: "一張猿猴圖片賣出天價，右鍵另存第一次引發產權辯論", context: "NFT把藝術、社群身份與投機結合，鏈上交易量暴增，版權與流動性問題也隨之浮現。", meme: "圖片可以複製，成交紀錄不能假裝沒看見", kind: "crypto", asset: { category: "加密貨幣", name: "無聊韭猴NFT" } },
  { year: 2021, topic: "振興五倍券", headline: "五倍券再度登場，支付平台把回饋規則寫成選擇題", context: "消費振興資金流向餐飲、旅遊與零售，數位綁定和紙本排隊再次反映不同世代習慣。", meme: "五倍不是報酬率，是領券倍率", kind: "career", asset: { category: "台股", name: "五倍內需回血股" } },
  { year: 2021, topic: "中國科技監管風暴", headline: "補教、平台與遊戲公司接連遭監管，中概股暑假沒有作業只有跌停", context: "政策快速轉向改變網路平台商業模式，全球投資人重新計算監管折價與單一市場風險。", meme: "基本面沒變，規則先更新", kind: "tech", asset: { category: "ETF", name: "中概監管驚嚇ETF" } },

  { year: 2022, topic: "國安基金進場", headline: "台股跌勢擴大，國安基金宣布進場替信心加護欄", context: "升息、戰爭與科技股修正壓低市場情緒，護盤機制的進場時點、規模與實際效果成為焦點。", meme: "國家隊進場，我的個股還在門外", kind: "market", asset: { category: "ETF", name: "國家隊護盤大盤ETF" } },
  { year: 2022, topic: "裴洛西訪台", headline: "美國眾院議長訪台，航班路線與晶片地緣風險同時受矚目", context: "高層訪問引發區域軍事演訓與市場波動，航運、國防與半導體供應鏈風險升高。", meme: "追飛機的人很多，追高的人更多", kind: "macro", asset: { category: "ETF", name: "海峽風險雷達ETF" } },
  { year: 2022, topic: "美國晶片法案", headline: "美國用補貼吸引晶圓廠，半導體國家隊從一國變成多國聯賽", context: "晶片法案提供製造與研發獎勵，也附帶投資限制，台灣供應鏈在補助與成本之間重新布局。", meme: "補貼很香，條件寫在後面", kind: "tech", asset: { category: "美股", name: "星條旗晶片聯盟" } },
  { year: 2022, topic: "英國迷你預算危機", headline: "英國大減稅計畫嚇壞債市，退休基金差點被槓桿拖走", context: "無資金來源的財政方案推升公債殖利率，槓桿退休基金被迫賣債，央行緊急出手穩定市場。", meme: "預算很迷你，市場反應超大", kind: "macro", asset: { category: "期貨", name: "英國公債驚魂期貨" } },
  { year: 2022, topic: "中國封城供應鏈", headline: "上海封城讓貨櫃與零件動不了，全球工廠再次等一張通行證", context: "嚴格防疫政策衝擊生產、物流與消費，電子與汽車供應鏈交期再度拉長。", meme: "訂單在線上，貨卡在路上", kind: "career", asset: { category: "ETF", name: "封城斷鏈替代ETF" } },
  { year: 2022, topic: "聊天機器人首秀", headline: "生成式AI突然能寫文章與程式，老AI供應鏈開始被市場重新點名", context: "ChatGPT公開亮相後，雲端運算、伺服器、記憶體與網通設備的需求想像快速升溫，沉寂多年的AI概念股重新取得估值劇本。", meme: "昨天還叫伺服器，今天全部改名AI", kind: "tech", asset: { category: "台股", name: "老AI解套聯盟" } },

  { year: 2023, topic: "矽谷銀行倒閉", headline: "新創最愛的銀行被擠兌關門，長債虧損突然變成現金危機", context: "快速升息侵蝕債券價值，存款集中與流動性管理失敗引發區域銀行震盪。", meme: "資產很安全，只是今天不能變現", kind: "market", asset: { category: "美股", name: "矽谷不擠兌銀行" } },
  { year: 2023, topic: "瑞信危機", headline: "百年銀行信心崩落，被競爭對手在週末緊急接走", context: "長期治理問題與市場恐慌迫使監管協調併購，銀行債券順位也讓投資人重新讀契約。", meme: "百年招牌，週末特價", kind: "market", asset: { category: "美股", name: "瑞氣不足銀行債" } },
  { year: 2023, topic: "美國債限拉鋸", headline: "美國政府又接近刷爆額度，短期國債開始附帶政治風險", context: "國會與白宮談判牽動違約疑慮、政府支出與全球避險資產，市場每天計算最後期限。", meme: "信用卡不能剪，額度可以再談", kind: "macro", asset: { category: "ETF", name: "國庫額度協商ETF" } },
  { year: 2023, topic: "老師代操保證獲利", headline: "老師曬出獲利對帳單，私訊卻只剩匯款帳號", context: "假投顧用名人背書、群組見證與保證獲利吸引代操，虧損後才發現帳面數字無法提領。", meme: "老師帶你飛，客服先消失", kind: "market", asset: { category: "台股", name: "老師保證獲利股" } },
  { year: 2023, topic: "Threads登台", headline: "新的文字社群一夜湧入用戶，品牌小編重新開始追蹤數", context: "社群平台競爭改變內容流量、廣告預算與創作者生態，短期爆紅能否留住用戶成為焦點。", meme: "脆友先集合，商業模式等等", kind: "meme", asset: { category: "美股", name: "脆脆社群平台" } },
  { year: 2023, topic: "平均地權修法", headline: "預售屋換約受到限制，短線炒房的逃生門突然變窄", context: "平均地權條例修法加強預售屋轉售限制與炒作查核，建商推案、投資客週轉與房市交易量重新定價。", meme: "房子還沒蓋好，轉手先被鎖好", kind: "housing", asset: { category: "房地產", name: "預售屋限轉宅" } },

  { year: 2024, topic: "比特幣現貨ETF", headline: "美國核准比特幣現貨ETF，幣圈終於穿西裝走進華爾街", context: "傳統資金取得更便利的加密曝險，託管、費率與波動風險也被包進熟悉的ETF外殼。", meme: "去中心化，先去券商開戶", kind: "crypto", asset: { category: "加密貨幣", name: "川幣" } },
  { year: 2024, topic: "輝達三兆與拆股", headline: "AI晶片龍頭站上市值三兆美元又拆股，皮衣成了全球制服", context: "生成式AI資本支出推升晶片需求，供應鏈獲利與估值同步擴張，也累積更高的期待。", meme: "一拆十不是變便宜，是信仰切片", kind: "tech", asset: { category: "美股", name: "皮衣三兆算力" } },
  { year: 2024, topic: "聯準會降息轉向", headline: "聯準會啟動降息，市場從猜會不會變成猜還能降幾次", context: "通膨降溫與就業風險促使貨幣政策轉向，債券、房貸與成長股重新估算資金成本。", meme: "第一碼是新聞，下一碼是信仰", kind: "macro", asset: { category: "ETF", name: "降息倒數長債ETF" } },
  { year: 2024, topic: "中國刺激政策煙火", headline: "中國宣布一系列刺激措施，低迷股市突然連放幾天煙火", context: "貨幣、房市與資本市場政策帶動短線反彈，需求能否持續與地方債問題仍待檢驗。", meme: "政策很多包，基本面慢慢拆", kind: "macro", asset: { category: "ETF", name: "政策煙火中概ETF" } },
  { year: 2024, topic: "川普再度勝選", headline: "川普重返白宮，關稅、減稅與移民政策再次進入投資試算表", context: "選舉結果帶動金融、能源與小型股行情，全球供應鏈則提前為美國優先政策準備多套劇本。", meme: "熟悉的紅帽，熟悉的波動", kind: "macro", asset: { category: "美股", name: "紅帽回歸交易" } },
  { year: 2024, topic: "台灣電價調漲", headline: "民生與產業電價再次調整，用電大戶先把成本模型重算一遍", context: "燃料成本與供電財務壓力反映到電價，高耗能產業毛利、節能設備與綠電需求同步受到影響。", meme: "電表轉一圈，毛利少一點", kind: "macro", asset: { category: "台股", name: "節能設備受惠鏈" } },

  { year: 2025, topic: "限空令護盤", headline: "股市急跌後限空措施上路，放空成本與短線籌碼一起改變", context: "關稅衝擊放大市場波動，主管機關調整平盤下放空與借券規則，護盤效果和價格發現引發討論。", meme: "不是不能跌，是先請空軍排隊", kind: "market", asset: { category: "ETF", name: "限空令護盤ETF" } },
  { year: 2025, topic: "美國比特幣戰略儲備", headline: "川普政府把查扣比特幣納入戰略儲備，幣圈開始自稱國家資產", context: "政府數位資產政策提升制度能見度，也引發估值、採購與市場干預界線的爭論。", meme: "以前怕被政府查，現在等政府存", kind: "crypto", asset: { category: "加密貨幣", name: "國庫級紅帽比特幣" } },
  { year: 2025, topic: "星門AI投資計畫", headline: "美國宣布大型AI基礎建設計畫，資料中心還沒蓋就先缺電", context: "巨額投資承諾推升伺服器、晶片、電力與營建需求，執行進度與資金來源也受到市場檢視。", meme: "星門還沒開，訂單先穿越", kind: "tech", asset: { category: "美股", name: "星門算力基建" } },
  { year: 2025, topic: "台積追加美國投資", headline: "護國神山再加碼美國設廠，資本支出大到需要另一座山", context: "先進製程、封裝與研發投資擴大，客戶 proximity、補貼條件與海外成本成為長期獲利變數。", meme: "不是掏空，是山脈國際化", kind: "tech", asset: { category: "台股", name: "神山亞利桑那二期" } },
  { year: 2025, topic: "TikTok關停又復活", headline: "短影音平台在美國短暫關停又恢復，創作者一天內搬家兩次", context: "禁令、出售與行政延期期限反覆變動，平台用戶、廣告主與雲端服務商承受政策不確定性。", meme: "昨天告別文，今天正常更新", kind: "meme", asset: { category: "美股", name: "關一天短影音" } },
  { year: 2025, topic: "美國主權債信降評", headline: "美國最高債信評等再失一席，債券市場重新計算赤字與利息負擔", context: "高額財政赤字與政治協商風險引發降評，長天期公債殖利率與全球資產定價受到牽動。", meme: "欠最多錢的人，信用卡還是全球通用", kind: "macro", asset: { category: "ETF", name: "美債降評避震ETF" } },

  { year: 2026, topic: "碳費正式繳交", headline: "台灣企業首次依排放量繳碳費，空氣終於出現在成本表", context: "碳定價從盤查走向實際支出，高排放產業加速節能、綠電與設備汰換，也影響出口競爭力。", meme: "以前排碳不用錢，現在每噸都會說話", kind: "macro", asset: { category: "台股", name: "碳費減量設備鏈" } },
  { year: 2026, topic: "AI投顧勝率神話", headline: "虛擬老師宣稱AI選股勝率九成，訂閱鍵比模型說明更清楚", context: "生成式AI被包裝成自動選股與喊單工具，回測偏誤、資料來源與責任歸屬成為新風險。", meme: "模型不會情緒化，行銷文案會", kind: "tech", asset: { category: "台股", name: "AI老師勝率神話" } },
  { year: 2026, topic: "AI用電吃緊", headline: "資料中心搶電搶地，AI模型每次回答都開始有人算電費", context: "算力建設推升電網、儲能與散熱需求，企業也面對能源取得、碳排與地方溝通限制。", meme: "模型在雲端，電表在人間", kind: "tech", asset: { category: "台股", name: "算力吃電基建" } },
  { year: 2026, topic: "企業債再融資高牆", headline: "低利率年代發行的公司債陸續到期，企業開始面對更貴的續借成本", context: "高利率環境拉高利息支出與違約風險，現金流較弱的公司必須削減投資、增資或出售資產。", meme: "債可以展期，利率不會裝沒看見", kind: "macro", asset: { category: "ETF", name: "高品質公司債ETF" } },
];

// 題庫審查：移除重複度高、與可交易標的連結較薄弱，或只能勉強套上概念股的題材。
// 保留 75 個明確影響企業獲利、利率、供應鏈、資產價格或市場制度的主題。
const retiredTopics = new Set([
  "抓寶經濟",
  "台股萬點",
  "最長萬點",
  "台灣芭樂輸美",
  "三級警戒",
  "五月大停電",
  "全台蛋荒",
  "山道猴子",
  "台南強震與耐震題材",
  "手機電池召回",
  "原物料落底反彈",
  "聯準會年底升息",
  "鴻海威州投資案",
  "0206花蓮強震",
  "衛生紙之亂",
  "非洲豬瘟邊境戰",
  "台股重返一萬二",
  "振興三倍券",
  "振興五倍券",
  "Threads登台",
  "叫車平台罰單戰",
  "815大停電",
  "GDPR上路",
  "外送經濟",
  "香港反送中衝擊",
  "美國回購市場吃緊",
  "美國大選開票震盪",
  "台股萬八行情",
  "303大停電",
  "英國迷你預算危機",
  "聊天機器人首秀",
  "美國債限拉鋸",
  "0403花蓮地震",
  "黃金歷史高價",
  "TikTok關停又復活",
  "AI帶動高成長",
]);

const allMoments = [...moments, ...supplementalMoments].filter((moment) => !retiredTopics.has(moment.topic));

const lenses = [
  {
    tag: "開盤第一反應",
    title: "市場先動了",
    body: "價格先反應，消息仍待確認。",
    quote: (meme: string) => `${meme}。先看數字。`,
    source: "開盤前的投資群組",
    effect: {
      label: "搶先反應",
      detail: "行情訊號強度 +25%；消息仍混亂，研究／觀察／追熱門判讀率分別 −3%／−6%／−8%。",
      signalStrengthMultiplier: 1.25,
      primaryDurationBonusMonths: 0,
      readAccuracyModifiers: { research: -.03, observe: -.06, trend: -.08 },
    },
  },
  {
    tag: "小資生活帳",
    title: "後座力才開始",
    body: "薪水、生活與本金都要重排。",
    quote: (meme: string) => `${meme}。月底對帳。`,
    source: "月底現金流本人",
    effect: {
      label: "基本面延燒",
      detail: "現金流影響較持久，主要標的行情訊號額外延長 1 季。",
      signalStrengthMultiplier: 1,
      primaryDurationBonusMonths: 3,
      readAccuracyModifiers: { research: 0, observe: 0, trend: 0 },
    },
  },
  {
    tag: "社群迷因場",
    title: "人人突然變專家",
    body: "獲利截圖跑得比查證快。",
    quote: (meme: string) => `${meme}。先別跟單。`,
    source: "轉傳三次後的原始消息",
    effect: {
      label: "流量陷阱",
      detail: "C 選項流量收入 +50%、投資知識額外 −1；研究／觀察／追熱門判讀率分別 −2%／−8%／−12%。",
      signalStrengthMultiplier: 1,
      primaryDurationBonusMonths: 0,
      readAccuracyModifiers: { research: -.02, observe: -.08, trend: -.12 },
      trendCashMultiplier: 1.5,
      trendKnowledgeDelta: -1,
    },
  },
  {
    tag: "事後諸葛會",
    title: "早知道最貴",
    body: "輪到你在答案公布前下注。",
    quote: () => "早知道，通常最貴。",
    source: "永遠買在最低點的回憶",
    effect: {
      label: "確認較晚",
      detail: "線索較容易判讀，研究／觀察／追熱門判讀率分別 +8%／+8%／+5%；但行情訊號強度 −25%。",
      signalStrengthMultiplier: .75,
      primaryDurationBonusMonths: 0,
      readAccuracyModifiers: { research: .08, observe: .08, trend: .05 },
    },
  },
] as const;

const basketByKind: Record<EventKind, { category: string; name: string }> = {
  tech: { category: "ETF", name: "00九八2欸" },
  market: { category: "ETF", name: "靈靈舞靈" },
  crypto: { category: "加密貨幣", name: "橘貓幣" },
  housing: { category: "ETF", name: "靈靈舞靈" },
  career: { category: "ETF", name: "韭零韭大盤ETF" },
  macro: { category: "ETF", name: "靈靈舞靈" },
  meme: { category: "ETF", name: "韭零韭大盤ETF" },
};

// 相近題材會合併到較少的可交易標的，讓玩家能管理既有持倉。
const playableAssetAliases: Record<string, { category: string; name: string }> = {
  // 台股：45 → 34
  "低頭抓寶概念股": { category: "台股", name: "嗶一下支付聯盟" },
  "永不斷電能源": { category: "台股", name: "電網韌性升級" },
  "備援儲能國家隊": { category: "台股", name: "電網韌性升級" },
  "神山海外分店": { category: "台股", name: "神山亞利桑那二期" },
  "千金護國神積": { category: "台股", name: "護國神積" },
  "成熟製程缺貨王": { category: "台股", name: "護國神積" },
  "什麼都AI伺服器": { category: "台股", name: "老AI解套聯盟" },
  "算力吃電基建": { category: "台股", name: "節能設備受惠鏈" },
  "耐震營建更新": { category: "台股", name: "節能設備受惠鏈" },
  "AI出口國家隊": { category: "台股", name: "科技選邊供應鏈" },
  "花東韌性重建": { category: "台股", name: "節能設備受惠鏈" },
  // ETF：41 → 31
  "高處不勝寒ETF": { category: "ETF", name: "靈靈舞靈" },
  "萬二回歸紀念ETF": { category: "ETF", name: "靈靈舞靈" },
  "萬八高檔大盤ETF": { category: "ETF", name: "靈靈舞靈" },
  "兩萬點紀念ETF": { category: "ETF", name: "靈靈舞靈" },
  "國家隊護盤大盤ETF": { category: "ETF", name: "靈靈舞靈" },
  "升息抽水防守ETF": { category: "ETF", name: "長天期公債ETF" },
  "年底升息過節ETF": { category: "ETF", name: "長天期公債ETF" },
  "縮表退潮防守ETF": { category: "ETF", name: "長天期公債ETF" },
  "全球熔斷避震ETF": { category: "ETF", name: "靈靈舞靈" },
  "關稅談判避震ETF": { category: "ETF", name: "00九八2欸" },
  // 美股：30 → 23
  "深度求索AI": { category: "美股", name: "皮衣算力" },
  "抖一下短影音": { category: "美股", name: "脆脆社群平台" },
  "白宮政策輪動股": { category: "美股", name: "紅帽回歸交易" },
  "投行風控金融股": { category: "美股", name: "瑞氣不足銀行債" },
  "皮衣三兆算力": { category: "美股", name: "皮衣算力" },
  "星門算力基建": { category: "美股", name: "皮衣算力" },
  "關一天短影音": { category: "美股", name: "脆脆社群平台" },
  // 小型類別同步按比例收斂。
  "初代登月幣": { category: "加密貨幣", name: "橘貓幣" },
  "國庫級紅帽比特幣": { category: "加密貨幣", name: "川幣" },
  "英國公債驚魂期貨": { category: "ETF", name: "長天期公債ETF" },
  "預售屋限轉宅": { category: "房地產", name: "四十年夢想宅" },

  // 第二輪收斂：題庫共用較少的核心標的，合併時維持事件與產業／資產類型的因果關係。
  // 台股：23 → 20
  "五告快通訊": { category: "台股", name: "科技選邊供應鏈" },
  "誠信遊戲控股": { category: "台股", name: "保證獲利爆雷股" },
  "真的有擔保債權": { category: "台股", name: "保證獲利爆雷股" },
  "神山亞利桑那二期": { category: "台股", name: "護國神積" },
  // ETF：28 → 19
  "亞太退群重組ETF": { category: "ETF", name: "00九八2欸" },
  "供應鏈搬家ETF": { category: "ETF", name: "台美供應鏈再平衡" },
  "國庫額度協商ETF": { category: "ETF", name: "高品質公司債ETF" },
  "封城斷鏈替代ETF": { category: "ETF", name: "台美供應鏈再平衡" },
  "小資一股入魂": { category: "ETF", name: "靈靈舞靈" },
  "歐洲退群避震ETF": { category: "ETF", name: "長天期公債ETF" },
  "美債降評避震ETF": { category: "ETF", name: "高品質公司債ETF" },
  "高品質公司債ETF": { category: "ETF", name: "債市壓力測試ETF" },
  "限空令護盤ETF": { category: "ETF", name: "靈靈舞靈" },
  "隔夜水管流動性ETF": { category: "ETF", name: "長天期公債ETF" },
  // 美股：22 → 14
  "合法上路叫車網": { category: "美股", name: "水龍頭成長股" },
  "大而有感減稅股": { category: "美股", name: "紅帽美國優先組合" },
  "大而美財政派對": { category: "美股", name: "紅帽回歸交易" },
  "紅帽回歸交易": { category: "美股", name: "紅帽美國優先組合" },
  "年底科技修正股": { category: "美股", name: "水龍頭成長股" },
  "星條旗晶片聯盟": { category: "美股", name: "皮衣算力" },
  "有臉資料廣告網": { category: "美股", name: "水龍頭成長股" },
  "脆脆社群平台": { category: "美股", name: "水龍頭成長股" },
  "瑞氣不足銀行債": { category: "美股", name: "大摩" },
  "矽谷不擠兌銀行": { category: "美股", name: "大摩" },
  // 加密貨幣、期貨與房地產保留各自最有辨識度的核心標的。
  "無聊韭猴NFT": { category: "加密貨幣", name: "橘貓幣" },
  "真的穩定幣": { category: "加密貨幣", name: "橘貓幣" },
  "八月速度與激情": { category: "ETF", name: "靈靈舞靈" },
  "大排長榮航運期貨": { category: "台股", name: "貨櫃三雄聯盟" },
  "第二戶喘息宅": { category: "房地產", name: "四十年夢想宅" },

  // 最終收斂：300 題只使用少量核心標的，降低第一次遊玩的學習成本。
  "一滴不浪費水資源": { category: "台股", name: "節能設備受惠鏈" },
  "狗肉換電聯盟": { category: "台股", name: "電網韌性升級" },
  "保證獲利爆雷股": { category: "台股", name: "低鬼衛星" },
  "洗好再匯金融控股": { category: "台股", name: "低鬼衛星" },
  "科技選邊供應鏈": { category: "台股", name: "護國神積" },
  "被動元件漲價王": { category: "台股", name: "老AI解套聯盟" },
  "碳費減量設備鏈": { category: "台股", name: "節能設備受惠鏈" },
  "精算不會錯產險": { category: "台股", name: "低鬼衛星" },
  "鮭魚回流供應鏈": { category: "ETF", name: "靈靈舞靈" },
  "老師拍桌明牌股": { category: "台股", name: "低鬼衛星" },
  "老師會員群概念股": { category: "台股", name: "老AI解套聯盟" },
  "老師航海會員股": { category: "台股", name: "貨櫃三雄聯盟" },
  "AI老師勝率神話": { category: "台股", name: "老AI解套聯盟" },
  "老師保證獲利股": { category: "台股", name: "低鬼衛星" },

  // ETF 5：台灣大型權值股、台股大盤、科技、長天期公債與關稅題材。
  "中概監管驚嚇ETF": { category: "ETF", name: "00九八2欸" },
  "台美供應鏈再平衡": { category: "ETF", name: "科技供應鏈ETF" },
  "央行保險債券ETF": { category: "美股", name: "水龍頭成長股" },
  "亞洲資金轉向ETF": { category: "ETF", name: "長天期公債ETF" },
  "政策煙火中概ETF": { category: "ETF", name: "00九八2欸" },
  "降息倒數長債ETF": { category: "ETF", name: "長天期公債ETF" },
  "韭韭價值高息": { category: "ETF", name: "靈靈舞靈" },
  "海峽風險雷達ETF": { category: "ETF", name: "長天期公債ETF" },
  "殖利率倒掛長債ETF": { category: "ETF", name: "長天期公債ETF" },
  "債市壓力測試ETF": { category: "ETF", name: "長天期公債ETF" },
  "萬物皆漲原物料": { category: "ETF", name: "靈靈舞靈" },
  "銀髮長照生活ETF": { category: "ETF", name: "韭零韭大盤ETF" },
  "隱私餅乾合規ETF": { category: "ETF", name: "科技供應鏈ETF" },
  "負油價紀念桶": { category: "ETF", name: "長天期公債ETF" },
  "閃亮避險黃金期貨": { category: "ETF", name: "長天期公債ETF" },

  // 美股 8：大型科技、AI、金融、政策、電動車、生技與迷因題材。
  "不哭資安防線": { category: "美股", name: "水龍頭成長股" },
  "升息抗震價值股": { category: "美股", name: "大摩" },
  "永遠在線雲會議": { category: "美股", name: "水龍頭成長股" },
  "算力折舊科技巨頭": { category: "美股", name: "皮衣算力" },

  // 房地產 2：自住型房產與收租型房產。
  "空辦公室警報宅": { category: "房地產", name: "蛋黃收租小金庫" },

  // 上線版 16 標的：台股 4、ETF 4、美股 4、加密貨幣 2、房地產 2。
  "節能設備受惠鏈": { category: "ETF", name: "科技供應鏈ETF" },
  "國家隊防疫供應鏈": { category: "ETF", name: "靈靈舞靈" },
  "液冷伺服器聯盟": { category: "台股", name: "老AI解套聯盟" },
  "韭零韭大盤ETF": { category: "ETF", name: "靈靈舞靈" },
  "遊戲不停迷因股": { category: "美股", name: "水龍頭成長股" },
  "高速疫苗實驗室": { category: "美股", name: "水龍頭成長股" },
  "特會漲電動車": { category: "美股", name: "水龍頭成長股" },
  "自動排班科技": { category: "台股", name: "老AI解套聯盟" },
  "水果信仰": { category: "美股", name: "水龍頭成長股" },
  "東北亞避險傘ETF": { category: "ETF", name: "靈靈舞靈" },
  "掃碼回饋金控": { category: "美股", name: "大摩" },
};

const playableAsset = (asset: { category: string; name: string }) => {
  let current = asset;
  const visited = new Set<string>();
  while (playableAssetAliases[current.name] && !visited.has(current.name)) {
    visited.add(current.name);
    current = playableAssetAliases[current.name];
  }
  return current;
};

const safeLabels = [
  (moment: Moment) => `先查清「${moment.topic}」對${moment.asset.name}的影響`,
  (moment: Moment) => `替${moment.asset.name}的波動留緩衝`,
  (moment: Moment) => `查證「${moment.topic}」再碰${moment.asset.name}`,
  (moment: Moment) => `重做${moment.asset.name}的反方推演`,
];
const safeDescriptions = [
  (moment: Moment) => `先拆解${moment.asset.name}的營收、成本與估值。`,
  (moment: Moment) => `保留生活預備金，不讓${moment.asset.name}影響睡眠。`,
  (moment: Moment) => `確認消息真偽，再決定是否碰${moment.asset.name}。`,
  (moment: Moment) => `假設看錯${moment.asset.name}，先訂退場條件。`,
];
const steadyLabels = [
  (_moment: Moment, basket: { name: string }) => `小額買進${basket.name}`,
  (_moment: Moment, basket: { name: string }) => `分季布局${basket.name}`,
  (_moment: Moment, basket: { name: string }) => `只拿閒錢買${basket.name}`,
  (_moment: Moment, basket: { name: string }) => `分散配置${basket.name}`,
];
const propertyBuyLabels = ["買一間", "準備自備款買一間", "另買一間", "評估後買下一間"];
const boldLabels = [
  (moment: Moment) => `搶進${moment.asset.name}`,
  (moment: Moment) => `重押${moment.asset.name}`,
  (moment: Moment) => `跟風上車${moment.asset.name}`,
  (moment: Moment) => `相信${moment.asset.name}這次不同`,
];

function makeChoices(moment: Moment, lensIndex: number): Choice[] {
  const safeAction: Action = lensIndex === 1 ? "wait" : "learn";
  const basket = playableAsset(basketByKind[moment.kind]);
  const momentAsset = playableAsset(moment.asset);
  const simplifiedMoment = { ...moment, asset: momentAsset };
  const boldR = moment.kind === "crypto" ? 4 : momentAsset.category === "期貨" ? 5 : moment.kind === "housing" ? 4 : 3;
  const steadyIsProperty = basket.category === "房地產";
  const boldIsProperty = momentAsset.category === "房地產";
  return [
    { label: safeLabels[lensIndex](simplifiedMoment), desc: safeDescriptions[lensIndex](simplifiedMoment), action: safeAction, risk: "safe", minR: 1 },
    { label: steadyIsProperty ? `${propertyBuyLabels[lensIndex]}${basket.name}` : steadyLabels[lensIndex](moment, basket), desc: steadyIsProperty ? `買一間${basket.name}，自備款與房貸分開計算。` : `用${basket.name}分散參與，不把消息當保證。`, action: steadyIsProperty ? "buy" : "invest", risk: "steady", minR: moment.kind === "crypto" || moment.kind === "housing" ? 3 : 2, ratio: .2 + lensIndex * .015, asset: basket },
    { label: boldIsProperty ? `${propertyBuyLabels[lensIndex]}${momentAsset.name}` : boldLabels[lensIndex](simplifiedMoment), desc: boldIsProperty ? `整間買下「${momentAsset.name}」，獨立計算房貸與損益。` : `集中押注「${momentAsset.name}」，損益直接反映判斷。`, action: boldIsProperty ? "buy" : "invest", risk: "bold", minR: boldR, ratio: .44 + lensIndex * .035, asset: momentAsset },
  ];
}

function conciseContext(context: string) {
  const sentence = context.split(/[。！？]/)[0];
  const clauses = sentence.split(/[，；]/).filter(Boolean);
  return `${clauses.slice(0, 2).join("，")}。`;
}

const retiredAssets = new Set(["長天期公債ETF", "科技供應鏈ETF"]);
const eligibleMoments = allMoments.filter((moment) => {
  const asset = playableAsset(moment.asset);
  return moment.kind !== "housing" && asset.category !== "房地產" && !retiredAssets.has(asset.name);
});

// 上線題庫保留 70 個通過多空、主標的與連動標的審查的核心主題；每個主題有四種判讀角度，共 280 題。
// 九年人生共抽 72 題，因此整局最多只有 2 個核心題材需要以不同角度再次出現。
const catalogMoments = eligibleMoments;

type AuditedMarketSignal = { direction: MarketDirection; hint: string };

// 題庫的價格方向由人工審查表決定，不再用標題關鍵字猜測。
// hint 只補足因果線索，不直接把答案寫成「利多／利空」，讓玩家仍需自行判讀。
const auditedMarketSignals: Record<string, AuditedMarketSignal> = {
  "AlphaGo震撼": { direction: "bullish", hint: "AI運算需求與產業投資預期同步升溫。" },
  "衛星訂單延後": { direction: "bearish", hint: "訂單延後拉長回款時間，高融資成本與增資稀釋壓低估值。" },
  "川普勝選交易": { direction: "bullish", hint: "減稅與基建期待帶動美國政策受惠股買盤。" },
  "第一次幣圈狂熱": { direction: "bullish", hint: "新增資金追逐加密資產，市場成交與價格同步升溫。" },
  "川普減稅行情": { direction: "bullish", hint: "企業稅負下降預期推高獲利估值。" },
  "半導體交棒": { direction: "bearish", hint: "接班不確定性提高風險折價，短線買盤轉為保守。" },
  "被動元件缺貨漲價": { direction: "bullish", hint: "缺貨與漲價擴大供應商獲利想像。" },
  "5G與先進製程": { direction: "bullish", hint: "基地台與先進晶片訂單預期持續增加。" },
  "華為實體清單": { direction: "bearish", hint: "出口限制壓縮晶片訂單能見度，供應鏈風險升高。" },
  "口罩實名制": { direction: "bullish", hint: "政策採購與防疫供應需求替台灣市場提供支撐。" },
  "盤中零股": { direction: "bullish", hint: "交易門檻下降，小額資金更容易買進大型權值股，市場買盤增加。" },
  "零利率與無限水龍頭": { direction: "bullish", hint: "低利率與資產購買把資金推向成長型資產。" },
  "航運三雄": { direction: "bullish", hint: "運價上漲直接推升航運公司的獲利預期。" },
  "晶片荒": { direction: "bullish", hint: "供不應求提高產能利用率與晶圓代工議價能力。" },
  "迷因股": { direction: "bullish", hint: "散戶買盤與軋空預期在短線推高價格。" },
  "升息熊市": { direction: "bearish", hint: "資金成本急升，金融市場的信用風險擴大，估值與價格下修。" },
  "幣圈連環爆": { direction: "bearish", hint: "清算與信任危機引發加密資產持續賣壓。" },
  "高利率融資壓力": { direction: "bearish", hint: "資金成本上升壓縮高資本支出公司的估值，也降低投行承銷與交易動能。" },
  "生成式AI": { direction: "bullish", hint: "伺服器與算力需求上修，AI供應鏈訂單升溫。" },
  "台股兩萬點": { direction: "bullish", hint: "權值股創高與資金流入延續大盤上行動能。" },
  "00940之亂": { direction: "bullish", hint: "大規模募集資金帶來短期買盤，推高大盤ETF熱度。" },
  "八月股災": { direction: "bearish", hint: "槓桿平倉與科技股賣壓同步拖累大盤。" },
  "台積電千金行情": { direction: "bullish", hint: "AI訂單與先進製程獲利預期上修，推高權值股評價。" },
  "DeepSeek震撼": { direction: "bearish", hint: "低成本模型動搖高額算力支出的合理性，晶片估值承壓。" },
  "關稅震撼": { direction: "bearish", hint: "新增關稅提高出口成本並壓縮全球需求，出口型資產價格承壓。" },
  "對等關稅暫停鍵": { direction: "bullish", hint: "暫緩措施降低短期貿易衝突，風險買盤回流。" },
  "大而美減稅法案": { direction: "bullish", hint: "企業減稅預期支撐美國政策受惠股獲利。" },
  "AI資本支出折舊壓力": { direction: "bearish", hint: "回收期與折舊疑慮升高，市場下修高估值算力股。" },
  "兆豐洗錢裁罰": { direction: "bearish", hint: "裁罰與法遵成本侵蝕金融股獲利及信任。" },
  "財經台老師喊明牌": { direction: "bullish", hint: "老師公開主張價格將上漲，但拍桌與倒數不代表預測一定正確。" },
  "WannaCry勒索病毒": { direction: "bearish", hint: "營運中斷與資安損失壓低科技市場風險偏好。" },
  "當沖證交稅減半": { direction: "bullish", hint: "交易成本下降，券商成交量與手續費收入預期增加。" },
  "科技股年底重挫": { direction: "bearish", hint: "估值修正與年底賣壓拖累大型成長股。" },
  "付費會員群投顧": { direction: "bullish", hint: "會員群主張標的將上漲，但截圖不能證明長期勝率。" },
  "疫苗競賽": { direction: "bullish", hint: "正面試驗數據上修解封速度與企業獲利預期。" },
  "電動車拆股狂熱": { direction: "bullish", hint: "拆股降低單股門檻，散戶追價熱度升高。" },
  "航海王老師帶會員上船": { direction: "bullish", hint: "老師主張航運股將上漲，但喊單熱度不等於運價保證。" },
  "蘇伊士運河塞船": { direction: "bullish", hint: "繞航與船期延誤推升運價，航運獲利預期上修。" },
  "Archegos爆倉": { direction: "bearish", hint: "槓桿清算迫使投行認列損失，金融股承受賣壓。" },
  "NFT頭像狂熱": { direction: "bullish", hint: "投機資金湧入鏈上資產，推高幣圈成交熱度與價格。" },
  "中國科技監管風暴": { direction: "bearish", hint: "監管不確定性提高風險折價並壓低中概科技估值。" },
  "美國晶片法案": { direction: "bullish", hint: "補貼擴大半導體投資，晶片與算力供應鏈受惠。" },
  "矽谷銀行倒閉": { direction: "bearish", hint: "擠兌與債券虧損擴大金融體系的信用疑慮。" },
  "老師代操保證獲利": { direction: "bullish", hint: "老師口頭保證上漲，但匯款話術的可信度極低。" },
  "比特幣現貨ETF": { direction: "bullish", hint: "合規交易管道擴大，機構資金更容易進入加密市場。" },
  "輝達三兆與拆股": { direction: "bullish", hint: "市值創高與拆股熱度延續AI晶片買盤。" },
  "川普再度勝選": { direction: "bullish", hint: "減稅與鬆綁期待支撐美國政策受惠股。" },
  "限空令護盤": { direction: "bullish", hint: "放空成本提高，短線賣壓減輕並帶動護盤預期。" },
  "美國比特幣戰略儲備": { direction: "bullish", hint: "國家儲備敘事提高比特幣的政策需求想像。" },
  "台積追加美國投資": { direction: "bearish", hint: "龐大資本支出與海外成本使短期報酬率承壓。" },
  "一例一休": { direction: "bullish", hint: "排班與人事成本上升，企業增加自動化與管理軟體支出。" },
  "蘋果十週年機": { direction: "bullish", hint: "換機需求與高階零組件訂單推升大型科技供應鏈獲利預期。" },
  "美國退出TPP": { direction: "bearish", hint: "區域貿易規則重寫，提高亞太出口與供應鏈布局的不確定性。" },
  "北韓飛彈恐慌": { direction: "bearish", hint: "地緣風險升溫引發避險賣壓，亞洲風險資產承壓。" },
  "臉書資料醜聞": { direction: "bearish", hint: "監管與用戶信任危機提高平台成本，廣告成長預期遭到下修。" },
  "行動支付戰國": { direction: "bullish", hint: "支付滲透率與交易量成長，帶動金融科技服務的收入想像。" },
  "台商回流": { direction: "bullish", hint: "產能與訂單回流推升本地投資、出口與台股企業獲利預期。" },
  "聯準會預防性降息": { direction: "bullish", hint: "資金成本下降支撐成長股估值，風險買盤回流。" },
  "全球熔斷": { direction: "bearish", hint: "恐慌賣壓與信用緊縮同時擴散，全球大盤快速下修。" },
  "宅經濟": { direction: "bullish", hint: "遠距工作與線上消費增加，雲端和大型科技服務需求上修。" },
  "台積電宣布赴美設廠": { direction: "bearish", hint: "海外建廠成本與龐大資本支出提高，短期報酬率承壓。" },
  "TikTok禁令風波": { direction: "bearish", hint: "平台禁令與資料監管提高大型科技公司的政策風險折價。" },
  "戰爭與通膨": { direction: "bearish", hint: "能源與糧價上漲壓縮企業利潤，升息預期拖累大盤估值。" },
  "國安基金進場": { direction: "bullish", hint: "政策護盤帶來新增買盤並降低短線恐慌賣壓。" },
  "瑞信危機": { direction: "bearish", hint: "銀行信心與流動性疑慮擴大，全球金融股風險溢價升高。" },
  "皮衣教主旋風": { direction: "bullish", hint: "AI晶片與算力需求熱度升高，市場追價大型AI供應鏈。" },
  "中國刺激政策煙火": { direction: "bullish", hint: "政策刺激提高成長與企業獲利預期，資金回補中國相關資產。" },
  "星門AI投資計畫": { direction: "bullish", hint: "大型資料中心投資擴張，AI晶片與算力基建訂單預期上修。" },
  "AI伺服器出口": { direction: "bullish", hint: "出口與訂單同步成長，台灣AI伺服器供應鏈獲利預期上修。" },
  "AI投顧勝率神話": { direction: "bearish", hint: "勝率宣稱缺乏驗證，訂閱熱度無法支撐題材估值，市場開始下修信任。" },
};

// 連動標的依產業與風險來源固定配對，避免同一事件隨機連到無關商品。
const linkedAssetByPrimaryName: Record<string, { category: string; name: string }> = {
  "老AI解套聯盟": { category: "美股", name: "皮衣算力" },
  "低鬼衛星": { category: "美股", name: "大摩" },
  "紅帽美國優先組合": { category: "ETF", name: "00九八2欸" },
  "橘貓幣": { category: "加密貨幣", name: "川幣" },
  "護國神積": { category: "美股", name: "皮衣算力" },
  "00九八2欸": { category: "美股", name: "紅帽美國優先組合" },
  "靈靈舞靈": { category: "台股", name: "護國神積" },
  "水龍頭成長股": { category: "美股", name: "皮衣算力" },
  "貨櫃三雄聯盟": { category: "ETF", name: "00九八2欸" },
  "大摩": { category: "ETF", name: "靈靈舞靈" },
  "皮衣算力": { category: "台股", name: "老AI解套聯盟" },
  "川幣": { category: "加密貨幣", name: "橘貓幣" },
};

const auditedSignalForMoment = (moment: Moment) => {
  const audit = auditedMarketSignals[moment.topic];
  if (!audit) throw new Error(`事件「${moment.topic}」缺少人工多空審查`);
  return audit;
};

const linkedAssetForMoment = (moment: Moment) => {
  const primary = playableAsset(moment.asset);
  const linked = linkedAssetByPrimaryName[primary.name];
  if (!linked) throw new Error(`標的「${primary.name}」缺少連動標的設定`);
  return linked;
};

export const events: GameEvent[] = catalogMoments.flatMap((moment, momentIndex) =>
  lenses.map((lens, lensIndex) => {
    const marketSignal = auditedSignalForMoment(moment);
    return {
      id: `event-${momentIndex}-${lensIndex}`,
      topicId: `topic-${momentIndex}`,
      historicalYear: moment.year,
      topic: moment.topic,
      kind: moment.kind,
      lensIndex,
      lensEffect: lens.effect,
      tag: `${moment.topic} · ${lens.tag}`,
      title: `${moment.headline}｜${lens.title}`,
      body: `${conciseContext(moment.context)}${marketSignal.hint}${lens.body}`,
      quote: lens.quote(moment.meme),
      source: lens.source,
      marketDirection: marketSignal.direction,
      linkedAsset: linkedAssetForMoment(moment),
      choices: makeChoices(moment, lensIndex),
    };
  }),
);

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const eventTargetKey = (event: GameEvent) => {
  const target = event.choices[2]?.asset ?? event.choices.find((choice) => choice.asset)?.asset;
  return target ? `${target.category}:${target.name}` : "市場:整體市場";
};

// 每年四季、每季兩次主事件。先輪完所有不同題材，再使用同題材的其他角度；
// 同時平衡標的出場次數並拉長重複題材的間隔，避免少數 ETF 或熱門股霸占消息面。
export function buildLifeEventDeck(seed: number, yearCount = 20): GameEvent[] {
  const deck: GameEvent[] = [];
  const usedEventIds = new Set<string>();
  const topicUsage = new Map<string, number>();
  const targetUsage = new Map<string, number>();
  const lastTopicSlot = new Map<string, number>();
  let previousYearTopics = new Set<string>();

  for (let gameYear = 1; gameYear <= yearCount; gameYear += 1) {
    const yearTopics = new Set<string>();
    const yearKinds = new Set<EventKind>();

    for (let eventOfYear = 0; eventOfYear < 8; eventOfYear += 1) {
      const available = events.filter((event) => !usedEventIds.has(event.id) && !yearTopics.has(event.topicId));
      const minimumTopicUsage = Math.min(...available.map((event) => topicUsage.get(event.topicId) ?? 0));
      const leastUsedTopics = available.filter((event) => (topicUsage.get(event.topicId) ?? 0) === minimumTopicUsage);
      const freshKindCandidates = leastUsedTopics.filter((event) => !yearKinds.has(event.kind));
      const candidates = (freshKindCandidates.length > 0 ? freshKindCandidates : leastUsedTopics)
        .sort((left, right) => {
          const targetDifference = (targetUsage.get(eventTargetKey(left)) ?? 0) - (targetUsage.get(eventTargetKey(right)) ?? 0);
          if (targetDifference !== 0) return targetDifference;

          const leftRepeatedLastYear = previousYearTopics.has(left.topicId) ? 1 : 0;
          const rightRepeatedLastYear = previousYearTopics.has(right.topicId) ? 1 : 0;
          if (leftRepeatedLastYear !== rightRepeatedLastYear) return leftRepeatedLastYear - rightRepeatedLastYear;

          const leftLastSeen = lastTopicSlot.get(left.topicId) ?? Number.NEGATIVE_INFINITY;
          const rightLastSeen = lastTopicSlot.get(right.topicId) ?? Number.NEGATIVE_INFINITY;
          if (leftLastSeen !== rightLastSeen) return leftLastSeen - rightLastSeen;

          return stableHash(`${seed}:${gameYear}:${eventOfYear}:${left.id}`) - stableHash(`${seed}:${gameYear}:${eventOfYear}:${right.id}`);
        });

      const chosen = candidates[0];
      if (!chosen) throw new Error(`第 ${gameYear} 年無法建立八個季度事件牌組`);

      deck.push(chosen);
      usedEventIds.add(chosen.id);
      yearTopics.add(chosen.topicId);
      yearKinds.add(chosen.kind);
      topicUsage.set(chosen.topicId, (topicUsage.get(chosen.topicId) ?? 0) + 1);
      targetUsage.set(eventTargetKey(chosen), (targetUsage.get(eventTargetKey(chosen)) ?? 0) + 1);
      lastTopicSlot.set(chosen.topicId, deck.length - 1);
    }

    previousYearTopics = yearTopics;
  }

  return deck;
}

export const EVENT_COUNT = events.length;

if (EVENT_COUNT !== 280) {
  throw new Error(`事件題庫應為 280，實際為 ${EVENT_COUNT}`);
}
