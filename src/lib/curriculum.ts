import type { Knowledge, Language, Lesson, Question, Unit } from './types';

export const languages = {
  en: { name: '英语', native: 'English', mark: 'Aa', locale: 'en-US', color: '#217c65', greeting: 'Hello, world!', description: '把第一句，变成每一天。' },
  ja: { name: '日语', native: '日本語', mark: 'あ', locale: 'ja-JP', color: '#ad557b', greeting: 'こんにちは、世界。', description: '从一声问候，走近新世界。' },
  ko: { name: '韩语', native: '한국어', mark: '한', locale: 'ko-KR', color: '#6876ba', greeting: '안녕하세요, 세상!', description: '让每个音节，都有新的可能。' },
} as const;

// Each line is language-authored content: target, Chinese, optional reading,
// articulation/context hint, pedagogical chunks, explicitly accepted variants.
type Entry = [string, string, string, string, string?, string[]?];
type LessonSeed = [string, string, string, Entry[]];
type UnitSeed = [string, string, string, LessonSeed[]];
const en: UnitSeed[] = [
  ['第一声，问候世界', '从 hello 开始，认识新朋友', 'sun', [
    ['你好，新朋友', '会用三种常见表达打招呼与道别。', 'Hello 适用于一般问候；Good morning 用在早晨。Goodbye 是道别，不是见面问候。', [
      ['Hello', '你好', '', '开头轻呼气，末尾双元音自然滑动。'],
      ['Good morning', '早上好', '', 'morning 的重音在第一个音节。', 'Good|morning'],
      ['Goodbye', '再见', '', 'bye 部分重读；见面时不用 goodbye。'],
    ]],
    ['说说你是谁', '介绍自己的名字，并回应初次见面。', 'I am 可以缩写为 I’m。介绍名字时可用 My name is…；Nice to meet you 用于初次见面。', [
      ['I am Lin', '我是小林', '', 'am 跟在 I 后，Lin 是人名示例。', 'I|am|Lin', ["I’m Lin", "I'm Lin"]],
      ['My name is Lin', '我的名字是小林', '', 'name 是名字，is 连接名字。', 'My|name|is|Lin'],
      ['Nice to meet you', '很高兴认识你', '', '适合第一次见面时说。', 'Nice|to|meet|you'],
    ]],
    ['今天过得好吗', '询问和回应近况，并表达感谢。', 'How are you? 是熟人间常见的问候。I’m fine 是一种简短回应；Thank you 可以独立使用。', [
      ['How are you?', '你好吗？', '', '疑问句末尾语调自然上扬。', 'How|are|you?'],
      ["I’m fine", '我很好', '', 'fine 的元音要饱满，不要拆开读。', 'I’m|fine', ["I'm fine", 'I am fine']],
      ['Thank you', '谢谢', '', 'th 的舌尖轻触上下齿之间，气流通过。', 'Thank|you'],
    ]],
  ]],
  ['日常里的小发现', '说物品、表达需求与礼貌回应', 'leaf', [
    ['礼貌的小词', '用 yes、no 和 please 作简单回应。', 'Yes 表示肯定，No 表示否定。Please 用于礼貌请求，通常和请求内容一起说。', [
      ['Yes', '是的', '', '末尾 s 清晰送气。'], ['No', '不是', '', '可作否定回应，注意语气友善。'], ['Please', '请', '', '末尾是浊音 z，可放在请求前后。'],
    ]],
    ['身边的物品', '介绍书和包，并询问手机在哪里。', 'This is… 用来介绍眼前的事物；Where is…? 询问单个物品的位置。', [
      ['This is a book', '这是一本书', '', 'book 前需要 a。', 'This|is|a|book'],
      ['This is my bag', '这是我的包', '', 'my 表示“我的”，不再加 a。', 'This|is|my|bag'],
      ['Where is my phone?', '我的手机在哪里？', '', 'where 询问位置。', 'Where|is|my|phone?'],
    ]],
    ['喝点什么', '认识三种常见饮品名称。', 'Water、coffee 和 tea 在此表示饮品，作不可数名词使用。点餐时可以说 Water, please.（请给我水。）', [
      ['Water', '水', '', '美式英语中 t 可能读得很轻。'], ['Coffee', '咖啡', '', '重音在第一个音节。'], ['Tea', '茶', '', '长元音 /iː/ 稍拉长。'],
    ]],
  ]],
  ['一顿美味的对话', '从看菜单到礼貌买单', 'cup', [
    ['开始点餐', '礼貌索取菜单并点一杯茶。', 'I’d like… 比 I want… 更适合礼貌点餐。Here you are 是递东西时的“给您”。', [
      ['The menu, please', '请给我菜单', '', 'menu 重音在前。', 'The|menu,|please'],
      ["I’d like some tea", '我想要一些茶', '', 'I’d like 是 I would like 的缩写。', 'I’d|like|some|tea', ["I'd like some tea", 'I would like some tea']],
      ['Here you are', '给您', '', '递上菜单、食物或物品时使用。', 'Here|you|are'],
    ]],
    ['选一道喜欢的', '认识食物并说明素食需求。', 'Sandwich 是三明治；rice 是米饭；I’m vegetarian 表示“我吃素”，不是过敏声明。', [
      ['A sandwich', '一个三明治', '', 'sandwich 的重音在前。', 'A|sandwich'],
      ['Some rice', '一些米饭', '', 'rice 在这里是不可数名词。', 'Some|rice'],
      ["I’m vegetarian", '我吃素', '', 'vegetarian 指素食者。', 'I’m|vegetarian', ["I'm vegetarian", 'I am vegetarian']],
    ]],
    ['买单与付款', '索取账单，询价并询问刷卡。', 'The bill, please. 常用于买单。Can I pay by card? 询问能否用银行卡付款。', [
      ['The bill, please', '请结账', '', '英国英语常用 bill，美国英语也常用 check。', 'The|bill,|please'],
      ['How much is it?', '多少钱？', '', '询问一件物品或总金额。', 'How|much|is|it?'],
      ['Can I pay by card?', '我可以刷卡吗？', '', 'by card 表示用银行卡付款。', 'Can|I|pay|by|card?'],
    ]],
  ]],
  ['出发，去新的地方', '问路、乘车和酒店入住', 'map', [
    ['找到方向', '问车站位置并听懂简单指路。', 'Where is…? 询问地点；left 是左，straight 是直行。用 Excuse me 开头更礼貌。', [
      ['Where is the station?', '车站在哪里？', '', 'station 重音在前。', 'Where|is|the|station?'],
      ['Turn left', '向左转', '', 'left 的 ft 结尾连贯发出。', 'Turn|left'],
      ['Go straight', '直走', '', 'straight 开头的 str 连起来读。', 'Go|straight'],
    ]],
    ['搭上下一班车', '购票并询问是否前往机场。', 'One ticket, please. 是简短礼貌购票表达；Does this…? 用于询问这班交通工具。', [
      ['One ticket, please', '请给我一张票', '', 'one 表示一张。', 'One|ticket,|please'],
      ['Does this go to the airport?', '这班车去机场吗？', '', 'airport 是机场；具体车辆由语境决定。', 'Does|this|go|to|the|airport?'],
      ['Where is the train?', '火车在哪里？', '', 'train 的 tr 连在一起。', 'Where|is|the|train?'],
    ]],
    ['安心入住', '告诉前台已有预订并办理入住。', 'Reservation 指预订。Check in 表示办理入住，check out 表示退房，两者不要混淆。', [
      ['I have a reservation', '我有预订', '', 'reservation 的重音在 va。', 'I|have|a|reservation'],
      ['My name is Lin', '我的名字是小林', '', '报出预订时使用的姓名。', 'My|name|is|Lin'],
      ["I’d like to check in", '我想办理入住', '', '这里 check in 作动词短语。', 'I’d|like|to|check|in', ["I'd like to check in", 'I would like to check in']],
    ]],
  ]],
];
const ja: UnitSeed[] = [
  ['和假名打个照面', '选学 6 个平假名、3 个片假名', 'sun', [
    ['三个元音：あ・い・う', '辨认并跟读あ、い、う；这是文字入门选段。', '日语有平假名和片假名。先认识三个元音假名：あ、い、う。本单元只选学部分假名，不等于完整五十音课程。', [
      ['あ', '假名「あ」：元音 a', 'あ', '口自然张开，声音短而稳定。'], ['い', '假名「い」：元音 i', 'い', '嘴角稍向两侧，不要拖长。'], ['う', '假名「う」：元音 u', 'う', '嘴唇不必像普通话“乌”那样突出。'],
    ]],
    ['か行的第一步', '辨认か、き、く，感受辅音与元音组合。', 'か、き、く属于か行，分别把 k 与 a、i、u 组合。每个假名占一拍；本课仍是选段练习。', [
      ['か', '假名「か」：ka', 'か', '先轻发 k，再自然接あ的元音。'], ['き', '假名「き」：ki', 'き', '舌面靠近上腭，不要读成汉语“七”。'], ['く', '假名「く」：ku', 'く', '先发 k，接不突唇的う音。'],
    ]],
    ['片假名也认识你', '辨认ア、イ、ウ，与已学元音对应。', 'ア、イ、ウ分别对应あ、い、う，发音相同。片假名常用于外来语等；这里只展示三个字符。', [
      ['ア', '片假名「ア」：对应あ', 'ア', '发音和あ相同，注意字形不同。'], ['イ', '片假名「イ」：对应い', 'イ', '发音和い相同。'], ['ウ', '片假名「ウ」：对应う', 'ウ', '发音和う相同。'],
    ]],
  ]],
  ['初次见面的温度', '用自然、礼貌的方式问候', 'leaf', [
    ['一天的问候', '按时间使用礼貌的常见问候。', 'おはようございます用于早上；こんにちは用于白天；こんばんは用于晚上。后两句的は读作わ。', [
      ['おはようございます', '早上好', 'おはようございます', '较礼貌的早晨问候。', 'おはよう|ございます'],
      ['こんにちは', '你好', 'こんにちは', '结尾的は读作わ。'], ['こんばんは', '晚上好', 'こんばんは', '结尾的は读作わ。'],
    ]],
    ['请多关照', '完成一次简短的初次见面自我介绍。', 'はじめまして表示初次见面；わたしはリンです是自我介绍。よろしくお願いします是初次见面的礼貌收尾。', [
      ['はじめまして', '初次见面', 'はじめまして', '用于第一次见面。'],
      ['わたしはリンです', '我是小林', 'わたしはりんです', '助词は在这里读作わ。', 'わたしは|リン|です'],
      ['よろしくお願いします', '请多关照', 'よろしくおねがいします', '是礼貌的固定表达。', 'よろしく|お願い|します'],
    ]],
    ['谢谢与打扰', '向陌生人礼貌致谢、致歉和道别。', 'ありがとうございます是礼貌感谢。すみません可表示抱歉或打扰。失礼します用于礼貌告辞等场景。', [
      ['ありがとうございます', '谢谢您', 'ありがとうございます', 'ございます部分保持节奏，不逐字重读。', 'ありがとう|ございます'],
      ['すみません', '不好意思', 'すみません', '引起店员注意时也可以说。'],
      ['失礼します', '我先告辞了', 'しつれいします', '礼貌离开时使用。', '失礼|します'],
    ]],
  ]],
  ['日常的小小对话', '从身边的物品到简单问路', 'cup', [
    ['这是什么', '使用です句介绍或询问物品。', 'これは…です表示“这是……”；句尾か表示提问。日语礼貌陈述和疑问都可用です。', [
      ['これは本です', '这是书', 'これはほんです', '助词は读作わ。', 'これは|本|です'],
      ['これは何ですか', '这是什么？', 'これはなんですか', '何在这里读なん。', 'これは|何|ですか'],
      ['わたしのかばんです', '这是我的包', 'わたしのかばんです', 'の表示所属关系。', 'わたしの|かばん|です'],
    ]],
    ['问个方向', '询问车站、洗手间和出口位置。', '…はどこですか是礼貌问地点的句型。駅是车站，出口是出口，トイレ是洗手间。', [
      ['駅はどこですか', '车站在哪里？', 'えきはどこですか', '駅读えき。', '駅は|どこ|ですか'],
      ['トイレはどこですか', '洗手间在哪里？', 'といれはどこですか', 'トイレ用片假名书写。', 'トイレは|どこ|ですか'],
      ['出口はどこですか', '出口在哪里？', 'でぐちはどこですか', '出口读でぐち。', '出口は|どこ|ですか'],
    ]],
    ['听懂礼貌回应', '表示肯定、否定或没听明白。', 'はい和いいえ分别表示是与不是。わかりません表示“不明白”，是初学者可以安心使用的礼貌表达。', [
      ['はい', '是的', 'はい', '短而清楚地回应。'], ['いいえ', '不是', 'いいえ', '开头的い有两拍。'],
      ['わかりません', '我不明白', 'わかりません', '比随意说法更适合对陌生人使用。'],
    ]],
  ]],
  ['在小店里点餐', '用礼貌句型点餐与结账', 'map', [
    ['请给我菜单', '向店员索取菜单、水和茶。', '…をください表示“请给我……”。助词を读作お。お水和お茶是常见礼貌说法。', [
      ['メニューをください', '请给我菜单', 'めにゅーをください', 'メニュー的长音要保留。', 'メニューを|ください'],
      ['お水をください', '请给我水', 'おみずをください', '水读みず。', 'お水を|ください'],
      ['お茶をください', '请给我茶', 'おちゃをください', '茶读ちゃ，作为一拍。', 'お茶を|ください'],
    ]],
    ['我想要这个', '指物点餐，表达数量并致谢。', 'これをお願いします是指着菜单礼貌点餐。ひとつ表示一个；ありがとうございます表示感谢。', [
      ['これをお願いします', '请给我这个', 'これをおねがいします', '可以配合指菜单的动作。', 'これを|お願い|します'],
      ['ひとつください', '请给我一个', 'ひとつください', 'ひとつ是一般物品的数量说法。', 'ひとつ|ください'],
      ['ありがとうございます', '谢谢您', 'ありがとうございます', '对店员使用礼貌感谢。', 'ありがとう|ございます'],
    ]],
    ['用餐后的礼貌', '询价、请求结账并说餐后感谢。', 'お会計をお願いします用于结账。ごちそうさまでした是用餐后的致谢，不是付款请求。', [
      ['いくらですか', '多少钱？', 'いくらですか', 'いくら用于询问价格。', 'いくら|ですか'],
      ['お会計をお願いします', '请结账', 'おかいけいをおねがいします', '会計读かいけい。', 'お会計を|お願い|します'],
      ['ごちそうさまでした', '谢谢款待', 'ごちそうさまでした', '用餐结束后表达感谢。', 'ごちそうさま|でした'],
    ]],
  ]],
];
const ko: UnitSeed[] = [
  ['认识韩文的小方块', '3 个元音与 6 个拼读音节选段', 'sun', [
    ['先听三个元音', '辨认ㅏ、ㅗ、ㅜ；这是字母入门选段。', '韩文把辅音、元音拼成音节块。本课先选学三个元音，不代表完整字母表。独立元音符号的朗读依赖系统语音，缺失时请看口形提示继续。', [
      ['ㅏ', '元音ㅏ：张口音', '口形提示：嘴自然张开', '接近普通话“啊”，注意声音稳定。'],
      ['ㅗ', '元音ㅗ：圆唇中高音', '口形提示：嘴唇收圆', '嘴唇收圆，舌位比ㅜ低。'],
      ['ㅜ', '元音ㅜ：圆唇高音', '口形提示：收圆并稍前伸', '接近普通话“乌”，区别于ㅗ。'],
    ]],
    ['拼出가、나、다', '辨认三个辅音与ㅏ组合的音节。', '가、나、다各是一个音节块，元音都为ㅏ。ㄱ、ㄴ、ㄷ位于左边。韩语松音并不总等同于普通话声母。', [
      ['가', '音节가：ㄱ与ㅏ', '拆读：ㄱ + ㅏ', 'ㄱ为软腭音，不要强烈送气。'],
      ['나', '音节나：ㄴ与ㅏ', '拆读：ㄴ + ㅏ', '舌尖轻触上齿龈，鼻腔共鸣。'],
      ['다', '音节다：ㄷ与ㅏ', '拆读：ㄷ + ㅏ', '舌尖抵上齿龈后松开，避免强烈送气。'],
    ]],
    ['换个元音试试看', '辨认고、누、두，观察上下结构。', 'ㅗ和ㅜ写在辅音下方，形成上下结构。这是选段拼读，尚未覆盖收音、全部辅音或音变。', [
      ['고', '音节고：ㄱ与ㅗ', '拆读：ㄱ + ㅗ', '圆唇发ㅗ，不要读成双元音。'],
      ['누', '音节누：ㄴ与ㅜ', '拆读：ㄴ + ㅜ', '先发鼻音ㄴ，再接圆唇ㅜ。'],
      ['두', '音节두：ㄷ与ㅜ', '拆读：ㄷ + ㅜ', 'ㄷ后接ㅜ，声音短而自然。'],
    ]],
  ]],
  ['第一句，拉近距离', '从礼貌问候开始', 'leaf', [
    ['见面和感谢', '对陌生人礼貌问候、感谢和致歉。', '안녕하세요是常用礼貌问候。감사합니다和죄송합니다分别表达感谢与歉意，适合初学者在公共场景使用。', [
      ['안녕하세요', '您好', '拆读：안 / 녕 / 하 / 세 / 요', '녕有收音ㅇ，声音从鼻腔结束。'],
      ['감사합니다', '谢谢您', '拆读：감 / 사 / 합 / 니 / 다', '합니다自然连读常听作함니다。'],
      ['죄송합니다', '对不起', '拆读：죄 / 송 / 합 / 니 / 다', '认真致歉时使用。'],
    ]],
    ['认识新朋友', '介绍自己并表达初次见面的喜悦。', '저是谦称“我”；저는…입니다用于礼貌介绍。반갑습니다表示很高兴见到对方。', [
      ['저는 린입니다', '我是小林', '拆读：저는 / 린입니다', '는是主题助词，接在人称저后。', '저는|린입니다'],
      ['처음 뵙겠습니다', '初次见面', '拆读：처음 / 뵙겠습니다', '是较正式礼貌的初次见面表达。', '처음|뵙겠습니다'],
      ['반갑습니다', '很高兴见到您', '拆读：반 / 갑 / 습 / 니 / 다', '습니다中的ㅂ在鼻音前发生同化。'],
    ]],
    ['谁留下，谁离开', '根据对方是否留下选择道别说法。', '안녕히 계세요对留下的人说；안녕히 가세요对离开的人说。两者区别在对方的行动，而不是自己的行动。', [
      ['안녕히 계세요', '再见（对留下的人说）', '拆读：안녕히 / 계세요', '你离开，对方留在原地时使用。', '안녕히|계세요'],
      ['안녕히 가세요', '再见（对离开的人说）', '拆读：안녕히 / 가세요', '对方离开时使用。', '안녕히|가세요'],
      ['또 만나요', '下次再见', '拆读：또 / 만나요', '요结尾保持礼貌，适用于友善道别。', '또|만나요'],
    ]],
  ]],
  ['把日常说出来', '物品、位置与礼貌回应', 'cup', [
    ['这是什么', '礼貌询问和介绍身边物品。', '이거表示“这个”；뭐예요?表示“是什么？”；책이에요是“是书”的礼貌口语。', [
      ['이거 뭐예요?', '这是什么？', '拆读：이거 / 뭐예요', '뭐保持为一个音节。', '이거|뭐예요?'],
      ['책이에요', '是书', '拆读：책 / 이에요', '책有收音ㄱ，接元音时会连音。'],
      ['제 가방이에요', '是我的包', '拆读：제 / 가방이에요', '제是“我的”的谦称。', '제|가방이에요'],
    ]],
    ['请问在哪里', '礼貌询问车站和洗手间位置。', '…어디예요?表示“……在哪里？”；실례합니다常用于问路前引起注意。', [
      ['실례합니다', '打扰一下', '拆读：실 / 례 / 합 / 니 / 다', '可在向陌生人提问前说。'],
      ['역이 어디예요?', '车站在哪里？', '拆读：역이 / 어디예요', '역表示车站，이是主格助词。', '역이|어디예요?'],
      ['화장실이 어디예요?', '洗手间在哪里？', '拆读：화장실이 / 어디예요', '화장실是洗手间。', '화장실이|어디예요?'],
    ]],
    ['听不懂也没关系', '肯定、否定或请求再说一遍。', '네和아니요是常见礼貌回应。다시 말해 주세요是礼貌请求“请再说一遍”，可帮助继续交流。', [
      ['네', '是的', '拆读：네', '元音ㅔ不要读成ㅐ的书写。'], ['아니요', '不是', '拆读：아 / 니 / 요', '使用요结尾保持礼貌。'],
      ['다시 말해 주세요', '请再说一遍', '拆读：다시 / 말해 / 주세요', '다시是“再次”。', '다시|말해|주세요'],
    ]],
  ]],
  ['一起吃顿饭吧', '从菜单到结账的礼貌口语', 'map', [
    ['向店员开口', '礼貌索取菜单、水和咖啡。', '…주세요表示“请给我……”。这里使用요体请求，适合餐厅。메뉴판是菜单，물是水。', [
      ['메뉴판 주세요', '请给我菜单', '拆读：메뉴판 / 주세요', '주세요是点餐时很实用的礼貌结尾。', '메뉴판|주세요'],
      ['물 주세요', '请给我水', '拆读：물 / 주세요', '물的收音ㄹ用舌尖收尾。', '물|주세요'],
      ['커피 주세요', '请给我咖啡', '拆读：커피 / 주세요', '커的ㅓ不要发成圆唇ㅗ。', '커피|주세요'],
    ]],
    ['点一份喜欢的', '指物点餐，并询问辣度。', '이거 하나 주세요表示“请给我一个这个”。안 맵게 해 주세요请求做得不辣；可以先问매워요?。', [
      ['이거 하나 주세요', '请给我一个这个', '拆读：이거 / 하나 / 주세요', '하나是一个。', '이거|하나|주세요'],
      ['매워요?', '辣吗？', '拆读：매 / 워 / 요', '用上扬语调表达提问。'],
      ['안 맵게 해 주세요', '请做得不辣', '拆读：안 / 맵게 / 해 / 주세요', '안表示否定，这里是对制作方式的请求。', '안|맵게|해|주세요'],
    ]],
    ['好好吃，好好告别', '询价、结账并表达餐后感谢。', '계산해 주세요用于结账。잘 먹었습니다是餐后感谢，不能代替付款。얼마예요?用来询问价格。', [
      ['얼마예요?', '多少钱？', '拆读：얼 / 마 / 예 / 요', '注意예요的元音连接。'],
      ['계산해 주세요', '请结账', '拆读：계산해 / 주세요', '계산表示结账或计算。', '계산해|주세요'],
      ['잘 먹었습니다', '谢谢款待', '拆读：잘 / 먹 / 었 / 습 / 니 / 다', '用餐后表达吃得很好并致谢。', '잘|먹었습니다'],
    ]],
  ]],
];

function shuffled<T>(values: T[], salt: number): T[] {
  const array = [...values];
  for (let i = array.length - 1; i > 0; i--) { const j = (salt * 17 + i * 7) % (i + 1); [array[i], array[j]] = [array[j], array[i]]; }
  return array;
}
function build(language: Language, seeds: UnitSeed[]): Unit[] {
  const canonicalIds=new Map<string,string>();
  return seeds.map(([title, description, icon, lessonSeeds], u) => {
    const unitId = `${language}-u${u + 1}`;
    return { id: unitId, language, title, description, icon, lessons: lessonSeeds.map(([lessonTitle, goal, intro, entries], l) => {
      const id = `${unitId}-l${l + 1}`;
      const knowledge: Knowledge[] = entries.map(([target, meaning, reading, hint, chunks, accepted = []], i) => {
        const key=`${target.normalize('NFKC')}|${meaning}`;const knowledgeId=canonicalIds.get(key)??`${id}-k${i}`;canonicalIds.set(key,knowledgeId);
        return {
        id: knowledgeId, language, target, meaning, reading, hint, explanation: `${meaning}。${hint}`,
        difficulty: u > 1 ? 2 : 1, tokens: chunks?.split('|') ?? [target], acceptedAnswers: [target, ...accepted],
      };});
      const options = (kind: 'meaning' | 'target', i: number) => shuffled(knowledge.map(k => k[kind]), u * 11 + l * 3 + i);
      const make = (i: number, type: Question['type'], k: Knowledge, prompt: string, answer: string, opts: string[]): Question => ({
        id: `${id}-q${i}`, language, type, prompt, target: k.target, meaning: k.meaning, correctAnswer: answer,
        acceptedAnswers: answer === k.target ? k.acceptedAnswers : [answer], options: opts,
        explanation: k.explanation, knowledgeId: k.id, difficulty: k.difficulty,
      });
      const [a,b,c] = knowledge;
      const orderable = knowledge.find(k => k.tokens.length > 1);
      const questions: Question[] = [
        make(0, 'choice', a, '选出它的中文意思', a.meaning, options('meaning', 0)),
        make(1, 'choice', b, `哪一个表示「${b.meaning}」？`, b.target, options('target', 1)),
        { ...make(2, 'match', c, '把三组表达与意思配成对', 'matched', []), pairs: knowledge.map(k => ({ target: k.target, meaning: k.meaning,knowledgeId:k.id })), explanation:'每个表达都有自己的意思：'+knowledge.map(k=>`${k.target} → ${k.meaning}`).join('；')+'。' },
        orderable ? { ...make(3, 'order', orderable, `选词组成「${orderable.meaning}」`, orderable.target, []), tokens: shuffled(orderable.tokens, l + u + 2) }
          : make(3, 'choice', c, `选出「${c.meaning}」`, c.target, options('target', 3)),
        make(4, 'fill', a, `回想一下：用${languages[language].name}写出「${a.meaning}」`, a.target, []),
        make(5, 'listen', b, '听示范音，选出对应的中文意思', b.meaning, options('meaning', 5)),
      ];
      return { id, language, unitId, title: lessonTitle, goal, intro, knowledge, questions };
    }) };
  });
}
export const curriculum: Record<Language, Unit[]> = { en: build('en', en), ja: build('ja', ja), ko: build('ko', ko) };
export const allLessons: Lesson[] = Object.values(curriculum).flat().flatMap(u => u.lessons);
export const knowledgeById = Object.fromEntries(allLessons.flatMap(l => l.knowledge).map(k => [k.id, k]));
export const lessonById = Object.fromEntries(allLessons.map(l => [l.id, l]));
export function reviewQuestion(k: Knowledge): Question {
  const distractors = allLessons.filter(l => l.language === k.language).flatMap(l => l.knowledge).filter(x => x.meaning !== k.meaning).map(x => x.meaning);
  return { id: `review-${k.id}`, language: k.language, type: 'choice', prompt: '回想一下：这个表达是什么意思？', target: k.target, meaning: k.meaning,
    correctAnswer: k.meaning, acceptedAnswers: [k.meaning], options: shuffled([k.meaning, ...Array.from(new Set(distractors)).slice(0, 2)], k.id.length),
    explanation: k.explanation, knowledgeId: k.id, difficulty: k.difficulty };
}
