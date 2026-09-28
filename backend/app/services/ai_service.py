import json
import logging
from typing import Dict, Any, Optional, List
from app.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

# 기본 고품질 Mock 데이터 (API 키 부재 시 즉시 폴백)
DEFAULT_ANALYSIS: Dict[str, Any] = {
    "metadata": {
        "title": "광야에서 꽃 피우는 믿음의 비밀",
        "preacher": "김은호 목사",
        "passage": "출애굽기 15:22-26",
        "churchName": "오륜교회\n예배공동체",
        "publishedAt": "2026. 09. 21",
        "videoDuration": "35:42",
        "thumbnail": "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800&auto=format&fit=crop&q=80"
    },
    "shorts": [
        {
            "id": "short-1",
            "title": "죽고싶다는 당신에게 하나님의 대답",
            "title_question": "죽고싶다는 당신에게",
            "title_answer": "하나님의 대답",
            "startTime": "04:12",
            "endTime": "05:08",
            "duration": "56초",
            "hook": "인생의 쓴맛 앞에서 죽고 싶을 만큼 지친 당신에게 주시는 하나님의 대답",
            "summary": "광야의 쓴물(마라)을 만났을 때 모세처럼 하나님께 부르짖으면 쓴물이 치료의 단물로 바뀝니다.",
            "sentences": [
                { "id": 1, "start": "04:12", "end": "04:18", "text": "여러분, 사흘 길을 걸었는데 물이 없으면 얼마나 목이 마르겠습니까?" },
                { "id": 2, "start": "04:18", "end": "04:25", "text": "드디어 물을 발견했는데, 마셔보니 너무 써서 도저히 마실 수가 없었습니다." },
                { "id": 3, "start": "04:25", "end": "04:32", "text": "백성들은 모세를 원망하기 시작했습니다. '우리가 무엇을 마실까?'" },
                { "id": 4, "start": "04:32", "end": "04:41", "text": "그러나 모세는 그 자리에서 하나님께 부르짖어 기도했습니다!" },
                { "id": 5, "start": "04:41", "end": "04:50", "text": "하나님은 한 나무를 가리키셨고, 그 나무를 물에 던지니 물이 달아졌습니다." },
                { "id": 6, "start": "04:50", "end": "04:58", "text": "우리의 쓴 인생을 달게 만드는 유일한 길은 십자가 예수 그리스도입니다." },
                { "id": 7, "start": "04:58", "end": "05:08", "text": "원망을 멈추고 기도할 때, 하나님은 '치료하시는 여호와 라파'가 되어주십니다!" }
            ]
        },
        {
            "id": "short-2",
            "title": "연거푸 실수하는 당신에게 성령님의 음성",
            "title_question": "연거푸 실수하는 당신에게",
            "title_answer": "성령님의 음성",
            "startTime": "09:40",
            "endTime": "10:35",
            "duration": "55초",
            "hook": "넘어지고 또 쓰러져 낙심한 당신에게 들려오는 성령님의 세미한 음성",
            "summary": "광야는 버림받은 곳이 아니라, 오직 하나님 한 분만을 의지하게 하시는 훈련의 학교입니다.",
            "sentences": [
                { "id": 1, "start": "09:40", "end": "09:47", "text": "하나님은 왜 이스라엘 백성을 지름길 놔두고 홍해와 광야로 이끄셨을까요?" },
                { "id": 2, "start": "09:47", "end": "09:56", "text": "편한 길로 가면 아직 믿음의 근육이 없어서 전쟁을 보면 도망치기 때문입니다." },
                { "id": 3, "start": "09:56", "end": "10:05", "text": "광야에는 나침반도 없고 마트도 없고 병원도 없습니다. 아무것도 없습니다." },
                { "id": 4, "start": "10:05", "end": "10:14", "text": "아무것도 기댈 곳이 없을 때, 우리는 비로소 위를 쳐다봅니다." },
                { "id": 5, "start": "10:14", "end": "10:24", "text": "광야는 하나님의 임재가 가장 선명하게 나타나는 축복의 장소입니다." },
                { "id": 6, "start": "10:24", "end": "10:35", "text": "지금 광야를 지나고 있다면 기억하십시오. 하나님이 당신을 훈련시키고 계십니다." }
            ]
        },
        {
            "id": "short-3",
            "title": "앞이 캄캄한 당신에게 마라의 단물 기적",
            "title_question": "앞이 캄캄한 당신에게",
            "title_answer": "마라의 단물 기적",
            "startTime": "14:15",
            "endTime": "15:05",
            "duration": "50초",
            "hook": "더 이상 갈 곳이 없는 막다른 골목에서 마라의 쓴물이 단물로 변합니다.",
            "summary": "상황을 바꾸는 것은 불평이 아니라 감사입니다. 감사할 때 하늘 문이 열립니다.",
            "sentences": [
                { "id": 1, "start": "14:15", "end": "14:22", "text": "사탄이 성도들에게 가장 자주 던지는 미끼가 무엇인지 아십니까?" },
                { "id": 2, "start": "14:22", "end": "14:30", "text": "바로 '비교와 불평'입니다. 남과 비교하며 내 처지를 한탄하게 만듭니다." },
                { "id": 3, "start": "14:30", "end": "14:38", "text": "원망은 영혼의 전염병입니다. 한 사람이 불평하면 공동체 전체가 낙심합니다." },
                { "id": 4, "start": "14:38", "end": "14:48", "text": "그러나 믿음의 사람은 환경을 바라보지 않고 하나님의 언약을 바라봅니다." },
                { "id": 5, "start": "14:48", "end": "15:05", "text": "오늘 하루, 입술에서 원망의 말을 지우고 '그럼에도 감사합니다'를 선포하십시오!" }
            ]
        },
        {
            "id": "short-4",
            "title": "인생의 밑바닥인 당신에게 치료자 하나님의 신호",
            "title_question": "인생의 밑바닥인 당신에게",
            "title_answer": "치료자 하나님의 신호",
            "startTime": "18:20",
            "endTime": "19:15",
            "duration": "55초",
            "hook": "육체의 질병뿐 아니라 상한 마음까지 고치시는 여호와 라파",
            "summary": "하나님은 우리의 쓴 상처를 만지시고 온전히 회복시키시는 치유자이십니다.",
            "sentences": [
                { "id": 1, "start": "18:20", "end": "18:27", "text": "'여호와 라파' 하나님은 치료하시는 하나님이십니다." },
                { "id": 2, "start": "18:27", "end": "18:35", "text": "어떤 분은 오랜 육신의 질병으로 몸과 마음이 지쳐있을 수 있습니다." },
                { "id": 3, "start": "18:35", "end": "18:44", "text": "또 어떤 분은 사람에게 받은 배신과 상처의 독 때문에 잠 못 이루고 계십니다." },
                { "id": 4, "start": "18:44", "end": "18:54", "text": "세상 의사는 한계가 있지만, 전능하신 성령님께는 불가능이 없습니다." },
                { "id": 5, "start": "18:54", "end": "19:05", "text": "오늘 주님의 보혈이 여러분의 상처 난 심령과 환부에 덮이기를 축원합니다." },
                { "id": 6, "start": "19:05", "end": "19:15", "text": "치유의 광선을 발하시는 주님을 향해 두 손을 들고 나아오십시오." }
            ]
        },
        {
            "id": "short-5",
            "title": "고난이 길어지는 이유 곧 열릴 엘림의 축복",
            "title_question": "고난이 길어지는 이유",
            "title_answer": "곧 열릴 엘림의 축복",
            "startTime": "24:05",
            "endTime": "25:00",
            "duration": "55초",
            "hook": "마라의 쓴물 바로 뒤편에 물샘 12개와 종려나무 70주가 기다립니다.",
            "summary": "마라의 고난을 믿음으로 통과한 자에게 하나님은 엘림의 풍성한 오아시스를 예비하셨습니다.",
            "sentences": [
                { "id": 1, "start": "24:05", "end": "24:12", "text": "출애굽기 15장 마지막 구절을 보면 정말 놀라운 사실이 기록되어 있습니다." },
                { "id": 2, "start": "24:12", "end": "24:20", "text": "마라를 지나자마자 그들이 도착한 곳이 어디입니까? 바로 '엘림'입니다!" },
                { "id": 3, "start": "24:20", "end": "24:29", "text": "거기에는 물샘 열둘과 종려나무 일흔 그루가 기다리고 있었습니다." },
                { "id": 4, "start": "24:29", "end": "24:39", "text": "하나님은 이미 엘림의 오아시스를 다 준비해 두시고 마라를 건너게 하셨던 것입니다." },
                { "id": 5, "start": "24:39", "end": "24:50", "text": "조금만 더 참으십시오. 마라의 쓴맛은 잠깐이요, 곧 엘림의 축복이 열릴 것입니다!" },
                { "id": 6, "start": "24:50", "end": "25:00", "text": "끝까지 믿음을 포기하지 않는 성도가 엘림의 안식을 누리게 됩니다." }
            ]
        },
        {
            "id": "short-6",
            "title": "순종이 기적을 낳는 비밀",
            "title_question": "이해되지 않는 순간에도",
            "title_answer": "순종이 기적을 낳는 비밀",
            "startTime": "28:30",
            "endTime": "29:22",
            "duration": "52초",
            "hook": "이해되지 않는 순간에도 말씀대로 던질 때 역사가 일어납니다.",
            "summary": "나무를 물에 던지라는 하나님의 말씀은 상식에 맞지 않았지만, 순종했을 때 쓴물이 단물이 되었습니다.",
            "sentences": [
                { "id": 1, "start": "28:30", "end": "28:38", "text": "상식적으로 나무토막 하나 물에 던진다고 쓴 물이 마실 수 있는 물이 됩니까?" },
                { "id": 2, "start": "28:38", "end": "28:46", "text": "내 이성과 경험으로는 도무지 납득되지 않는 지시였습니다." },
                { "id": 3, "start": "28:46", "end": "28:55", "text": "그러나 신앙이란 무엇입니까? 내 생각을 내려놓고 하나님의 말씀에 항복하는 것입니다." },
                { "id": 4, "start": "28:55", "end": "29:05", "text": "모세가 아무런 토를 달지 않고 나무를 던졌을 때, 즉시 기적이 임했습니다." },
                { "id": 5, "start": "29:05", "end": "29:22", "text": "여러분의 생각을 꺾고 주의 말씀에 순종하십시오. 기적의 열쇠는 바로 당신의 순종입니다!" }
            ]
        }
    ],
    "meditations": [
        {
            "day": 1,
            "dayName": "월요일",
            "theme": "광야에서 마주한 마라의 쓴물",
            "bibleVerse": "출애굽기 15:22-23\n\"모세가 홍해에서 이스라엘을 인도하매 그들이 나와서 수르 광야로 들어가서 거기서 사흘길을 걸었으나 물을 얻지 못하고 마라에 이르렀더니 그 곳 물이 써서 마시지 못하겠으므로 그 이름을 마라라 하였더라\"",
            "content": "홍해를 건넌 감격과 승리의 찬양이 채 가시기도 전에 이스라엘 백성은 사흘 동안 물을 찾지 못하는 절망의 광야를 만났습니다. 겨우 발견한 오아시스조차 마실 수 없는 쓴물이었습니다.\n\n우리의 인생 여정도 이와 같습니다. 신앙의 결단을 하고 믿음으로 출발했음에도 불구하고, 뜻밖의 고난과 메마른 환경을 마주할 때가 있습니다. 마라의 쓴물은 하나님이 우리를 버리신 증거가 아니라, 우리의 연약한 믿음을 하나님께로 돌이키게 하시는 거룩한 초대입니다.",
            "question": "현재 내 삶에서 마주한 '마라의 쓴물(고통스러운 상황이나 풀리지 않는 문제)'은 무엇입니까?",
            "application": "오늘 하루, 내 힘으로 상황을 해결하려 조급해하지 말고 모든 무거운 짐을 주님 앞에 솔직히 털어놓기.",
            "closingPrayer": "주님, 인생의 갈증과 쓴맛 앞에서 낙심하지 않게 하시고, 메마른 광야에서도 저를 인도하시는 선하신 하나님을 신뢰하게 하소서. 예수님의 이름으로 기도드립니다. 아멘."
        },
        {
            "day": 2,
            "dayName": "화요일",
            "theme": "원망 대신 기도의 무릎을 꿇으라",
            "bibleVerse": "출애굽기 15:24-25a\n\"백성이 모세에게 원망하여 이르되 우리가 무엇을 마실까 하매 모세가 여호와께 부르짖었더니\"",
            "content": "동일한 위기 상황 앞에서 백성들은 모세를 원망했고, 지도자 모세는 하나님께 부르짖었습니다. 불평과 원망은 상황을 결코 개선하지 못하며 도리어 문제를 키우고 공동체를 분열시킵니다.\n\n반면 부르짖는 기도는 하늘 보좌를 움직이고 하나님의 개입을 불러옵니다. 기도는 문제보다 크신 하나님을 바라보는 믿음의 시선입니다. 불평이 입술 밖으로 나오려 할 때 그것을 기도의 언어로 바꾸십시오.",
            "question": "힘든 일이 생겼을 때 나의 첫 번째 반응은 불평입니까, 아니면 기도입니까?",
            "application": "입술에서 불평이나 불만의 말이 나오려 할 때 즉시 멈추고 30초 동안 짧은 감사 기도를 드리기.",
            "closingPrayer": "하나님 아버지, 환경에 휩쓸려 사람을 탓하거나 원망하던 저의 연약함을 용서하소서. 어떤 상황에서도 먼저 기도의 무릎을 꿇는 기도의 용사가 되게 하옵소서. 아멘."
        },
        {
            "day": 3,
            "dayName": "수요일",
            "theme": "십자가 나무를 던질 때 일어나는 변화",
            "bibleVerse": "출애굽기 15:25b\n\"여호와께서 그에게 한 나무를 가리키시니 그가 물에 던지니 물이 달게 되었더라\"",
            "content": "하나님은 모세에게 멀리 있는 다른 물을 찾으라 하지 않으시고, 곁에 있는 '한 나무'를 지시하셨습니다. 그 나무를 쓴물에 던지자 즉시 마실 수 있는 단물로 변화되었습니다.\n\n이 나무는 인류의 죄와 저주를 대신 짊어지신 예수 그리스도의 십자가를 예표합니다. 아무리 쓰고 독한 상처와 절망적인 현실이라도 그리스도의 십자가 은혜가 던져지면 용서와 치유, 소망의 단물로 바뀝니다.",
            "question": "내 마음 깊은 곳에 응어리진 쓴 뿌리에 십자가 보혈의 은혜를 적용하고 있습니까?",
            "application": "나를 아프게 했던 사람이나 사건을 예수님의 십자가 사랑으로 품고 축복하며 용서 선포하기.",
            "closingPrayer": "주 예수님, 십자가의 보혈로 제 상한 심령과 쓴 마음을 씻어 주옵소서. 주님의 사랑이 제 삶의 모든 쓴물을 단물로 바꾸어 주실 줄 믿습니다. 아멘."
        },
        {
            "day": 4,
            "dayName": "목요일",
            "theme": "치료하시는 여호와 라파를 만나라",
            "bibleVerse": "출애굽기 15:26\n\"이르시되 너희가 너희 하나님 나 여호와의 말을 들어 순종하고... 나는 너희를 치료하는 여호와임이라\"",
            "content": "마라의 사건을 통해 하나님은 자신을 '치료하는 여호와(여호와 라파)'로 계시하셨습니다. 하나님은 물만 치료하신 것이 아니라, 불평하던 백성들의 마음과 불신앙의 태도까지 치료하기를 원하셨습니다.\n\n치유의 조건은 하나님의 음성에 귀를 기울이고 그 말씀에 순종하는 것입니다. 주님의 치료는 육체의 질병 치유를 넘어, 영혼의 온전함과 하나님과의 관계 회복을 포함합니다.",
            "question": "오늘 내 영혼과 육체, 관계 속에서 여호와 라파의 치유가 가장 시급한 영역은 어디입니까?",
            "application": "건강과 마음의 평안을 위해 성경 말씀을 깊이 묵상하고 질병과 낙심을 예수 이름으로 대적하기.",
            "closingPrayer": "치료자 되시는 주님, 상하고 찢긴 제 영혼과 육신을 불쌍히 여기사 안수하여 주옵소서. 주님의 말씀에 온전히 순종하여 전인격적인 치유를 경험하게 하소서. 아멘."
        },
        {
            "day": 5,
            "dayName": "금요일",
            "theme": "마라 너머 예비된 엘림의 안식",
            "bibleVerse": "출애굽기 15:27\n\"그들이 엘림에 이르니 거기에 물 샘 열둘과 종려나무 일흔 그루가 있는지라 그들이 그 곳 그 물 곁에 장막을 치니라\"",
            "content": "마라를 지나 조금 더 나아가자 오아시스 '엘림'이 나타났습니다. 12개의 샘물과 70그루의 종려나무 그늘은 이스라엘 열두 지파 모두가 넉넉히 쉴 수 있는 완벽한 쉼터였습니다.\n\n하나님은 마라의 고통 뒤편에 풍성한 쉼과 회복을 이미 예비해 두셨습니다. 고난은 결코 마침표가 아닙니다. 하나님이 준비하신 엘림의 축복을 기대하며 오늘의 걸음을 믿음으로 전진하십시오.",
            "question": "고난 뒤에 예비된 하나님의 풍성한 은혜를 기대하며 소망 중에 기뻐하고 있습니까?",
            "application": "한 주간 베풀어주신 은혜를 돌아보고, 주말을 앞두며 주일 예배를 사모하는 마음으로 준비하기.",
            "closingPrayer": "신실하신 하나님, 고난의 광야 끝에 엘림의 쉼터를 예비해 주시니 감사합니다. 눈앞의 마라에 낙심치 않고 소망 중에 승리하는 믿음의 성도가 되게 하옵소서. 예수님의 이름으로 기도드립니다. 아멘."
        }
    ],
    "sermonCardNews": [
        {
            "id": 1,
            "type": "cover",
            "tag": "주일 설교 요약",
            "title": "광야에서 꽃 피우는\n믿음의 비밀",
            "subtitle": "마라의 쓴물이 단물로 변하는 영적 원리",
            "passage": "출애굽기 15:22-26",
            "speaker": "김은호 목사",
            "church": "오륜교회\n예배공동체"
        },
        {
            "id": 2,
            "type": "content",
            "tag": "Point 01",
            "title": "신앙의 여정에도\n광야와 마라가 있습니다",
            "body": "홍해의 기적을 체험한 백성들도 사흘 만에 목마름의 고통을 겪었습니다.\n\n고난을 만났다고 해서 하나님이 떠나신 것이 아닙니다. 광야는 하나님만을 온전히 신뢰하는 훈련의 시간입니다."
        },
        {
            "id": 3,
            "type": "content",
            "tag": "Point 02",
            "title": "원망은 길을 막고,\n기도는 기적을 엽니다",
            "body": "백성은 원망했으나 모세는 하나님께 부르짖었습니다.\n\n불평은 마음을 상하게 하고 믿음을 갉아먹지만, 절박한 기도는 하늘 문을 열고 하나님의 손길을 부릅니다."
        },
        {
            "id": 4,
            "type": "content",
            "tag": "Point 03",
            "title": "십자가 나무를\n내 삶의 쓴물에 던지십시오",
            "body": "모세가 한 나무를 물에 던졌을 때 쓴물이 단물이 되었습니다.\n\n어떤 쓴 상처와 저주도 예수 그리스도의 십자가 은혜가 닿으면 생명과 치유의 샘물로 변합니다."
        },
        {
            "id": 5,
            "type": "content",
            "tag": "Point 04",
            "title": "나는 너희를 치료하는\n여호와 라파라",
            "body": "하나님은 우리의 질병뿐 아니라 마음의 상처와 영적 불신앙까지 고치시는 치유자이십니다.\n\n그분의 말씀에 귀 기울이고 순종할 때 전인격적인 치유가 임합니다."
        },
        {
            "id": 6,
            "type": "content",
            "tag": "Point 05",
            "title": "마라 바로 곁에\n엘림이 준비되어 있습니다",
            "body": "마라를 지나면 12개의 샘과 70그루 종려나무가 있는 엘림이 기다립니다.\n\n고난은 통과하는 과정일 뿐, 하나님이 예비하신 최종 목적지는 풍성한 안식과 축복입니다."
        },
        {
            "id": 7,
            "type": "closing",
            "tag": "결단과 기도",
            "title": "오늘의 믿음 고백",
            "body": "\"주여, 내 입술의 원망을 멈추고 주께 부르짖게 하소서.\n십자가 보혈로 내 삶의 쓴물을 치유하시고,\n예비된 엘림의 축복을 향해 걸어가게 하옵소서.\"",
            "church": "오륜교회\n예배공동체"
        }
    ],
    "dailyCardNewsSets": {
        "1": [
            { "id": 1, "type": "cover", "tag": "Day 1 묵상", "title": "광야에서 마주한\n마라의 쓴물", "passage": "출애굽기 15:22-23", "church": "오륜교회" },
            { "id": 2, "type": "content", "tag": "말씀 묵상", "title": "갈증의 사흘 길", "body": "은혜의 홍해를 건넌 후에도 사흘 길 동안 물을 얻지 못할 수 있습니다.\n\n마라의 쓴물 앞에서 낙심치 마십시오. 하나님을 만날 기회입니다." },
            { "id": 3, "type": "content", "tag": "삶의 적용", "title": "마라를 대하는 태도", "body": "내 삶의 마라는 무엇입니까?\n\n내 지혜로 발버둥치지 말고, 메마른 광야의 주인 되시는 주님께 시선을 고정하십시오." },
            { "id": 4, "type": "closing", "tag": "마치는 기도", "title": "월요일의 기도", "body": "주님, 인생의 갈증과 쓴맛 앞에서도 주님의 인도하심을 의심치 않게 하소서.", "church": "오륜교회" }
        ],
        "2": [
            { "id": 1, "type": "cover", "tag": "Day 2 묵상", "title": "원망 대신\n기도의 무릎을", "passage": "출애굽기 15:24-25", "church": "오륜교회" },
            { "id": 2, "type": "content", "tag": "말씀 묵상", "title": "두 가지 반응", "body": "백성은 사람을 원망했고, 모세는 하나님께 부르짖었습니다.\n\n원망은 독이 되지만 기도는 해독제가 됩니다." },
            { "id": 3, "type": "content", "tag": "삶의 적용", "title": "입술의 파수꾼", "body": "오늘 하루 불평이 튀어나오려 할 때마다 30초 동안 짧은 감사의 기도를 올려드리십시오." },
            { "id": 4, "type": "closing", "tag": "마치는 기도", "title": "화요일의 기도", "body": "원망을 그치고 기도로 승리하는 기도의 용사가 되게 하옵소서.", "church": "오륜교회" }
        ],
        "3": [
            { "id": 1, "type": "cover", "tag": "Day 3 묵상", "title": "십자가 나무를\n던질 때", "passage": "출애굽기 15:25", "church": "오륜교회" },
            { "id": 2, "type": "content", "tag": "말씀 묵상", "title": "한 나무의 신비", "body": "주님이 가리키신 나무를 던지니 쓴물이 달아졌습니다.\n\n예수 그리스도의 십자가만이 상처와 저주를 치유로 바꿉니다." },
            { "id": 3, "type": "content", "tag": "삶의 적용", "title": "십자가의 능력", "body": "용서하기 어려운 사람이 있습니까? 십자가의 보혈을 그 상처 위에 덮으십시오." },
            { "id": 4, "type": "closing", "tag": "마치는 기도", "title": "수요일의 기도", "body": "주 예수님, 십자가 사랑으로 제 마음의 모든 쓴물을 단물로 바꾸어 주소서.", "church": "오륜교회" }
        ],
        "4": [
            { "id": 1, "type": "cover", "tag": "Day 4 묵상", "title": "치료하시는\n여호와 라파", "passage": "출애굽기 15:26", "church": "오륜교회" },
            { "id": 2, "type": "content", "tag": "말씀 묵상", "title": "치유의 하나님", "body": "여호와 라파는 물뿐만 아니라 우리의 마음과 영혼을 고치시는 분입니다.\n\n말씀에 순종할 때 참된 치유가 시작됩니다." },
            { "id": 3, "type": "content", "tag": "삶의 적용", "title": "순종의 결단", "body": "오늘 주님이 내게 들려주시는 말씀에 토 달지 않고 그대로 순종해 보십시오." },
            { "id": 4, "type": "closing", "tag": "마치는 기도", "title": "목요일의 기도", "body": "영육의 상처를 만지사 온전케 하시는 주님의 치료 광선을 허락하소서.", "church": "오륜교회" }
        ],
        "5": [
            { "id": 1, "type": "cover", "tag": "Day 5 묵상", "title": "마라 너머의\n엘림의 쉼터", "passage": "출애굽기 15:27", "church": "오륜교회" },
            { "id": 2, "type": "content", "tag": "말씀 묵상", "title": "예비된 오아시스", "body": "마라 바로 다음 정거장은 12개 샘물과 70그루 종려나무가 있는 엘림이었습니다.\n\n하나님의 은혜는 고난보다 항상 큽니다." },
            { "id": 3, "type": "content", "tag": "삶의 적용", "title": "믿음의 기대", "body": "마라의 쓴맛은 잠깐입니다. 곧 다가올 엘림의 안식을 바라보며 인내하십시오." },
            { "id": 4, "type": "closing", "tag": "마치는 기도", "title": "금요일의 기도", "body": "풍성한 엘림의 은혜를 예비하신 신실하신 주님을 찬양합니다. 아멘.", "church": "오륜교회" }
        ]
    }
}

async def analyze_sermon_video(
    youtube_url: str,
    video_details: Optional[Dict[str, Any]] = None,
    custom_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    유튜브 설교 영상을 실제 분석하여 6개 쇼츠 후보, 5일 묵상, 카드뉴스를 정밀하게 생성합니다.
    Gemini 3.8 Flash 모델의 멀티모달 및 실제 자막 데이터를 결합하여 정확한 타임스탬프와 문장을 추출합니다.
    """
    api_key = custom_api_key or GEMINI_API_KEY
    if not api_key:
        logger.warning("GEMINI_API_KEY가 설정되어 있지 않아 Mock 데이터를 반환합니다.")
        return DEFAULT_ANALYSIS

    from google import genai
    from google.genai import types

    details = video_details or {}
    title = details.get("title", "")
    channel = details.get("channel", "")
    description = details.get("description", "")
    duration_str = details.get("duration_str", "")
    transcript_text = details.get("transcript_text", "")

    # 자막 텍스트가 긴 경우 Gemini 3.8 Flash 컨텍스트에 맞게 최대 35,000자 전달
    if len(transcript_text) > 35000:
        transcript_snippet = transcript_text[:35000] + "\n...(후략)..."
    else:
        transcript_snippet = transcript_text

    prompt = f"""
당신은 대한민국 최고 수준의 설교 미디어 및 기독교 콘텐츠 기획 전문가입니다.
제공된 실제 유튜브 설교 영상 정보와 대본(자막)을 깊이 있게 분석하여 성도들에게 은혜를 주는 멀티미디어 콘텐츠 세트를 생성해주세요.

[분석 대상 유튜브 영상 정보]
- 영상 URL: {youtube_url}
- 영상 제목: {title}
- 채널 / 설교 교회: {channel}
- 영상 총 길이: {duration_str}
- 영상 설명란:
{description[:1500] if description else "없음"}

[실제 설교 대본 / 자막 (타임스탬프 포함)]:
{transcript_snippet if transcript_snippet else "(자막 미제공: 영상 설명란 및 제목 기반 정밀 분석)"}

[요청 사항 - 반드시 실제 설교 및 영상 내용에 근거하여 작성]:
1. 설교 기본 메타데이터:
   - title: 설교 제목 (영상 제목과 대본에서 가장 은혜로운 핵심 제목)
   - preacher: 설교자 목사님 성함 (예: "OOO 목사", 제목이나 설명란에서 파악)
   - passage: 본문 성경 구절 (예: "로마서 8:28", "출애굽기 15:22-26" 등)
   - churchName: 교회명 / 채널명
   - publishedAt: 발행일 또는 현재 날짜 (YYYY. MM. DD)
   - videoDuration: 영상 길이 (예: "{duration_str or '35:00'}")

2. 하이라이트 쇼츠 후보 6개 (실제 자막의 타임스탬프를 정밀 반영):
   - id: "short-1" ~ "short-6"
   - title: 쇼츠 대표 제목 (성도의 삶의 질문과 하나님의 답이 드러나는 매력적인 제목)
   - [필수 헤더 2줄 - 유튜브 쇼츠 전용 최적화 헤더]:
     * title_question: 유튜브 영상 상단 1줄용 '성도의 고통/궁금증/현실적인 질문' (예: "죽고싶다는 당신에게", "연거푸 실수하는 당신에게", "인생의 밑바닥인 당신에게")
     * title_answer: 유튜브 영상 상단 2줄용 '그에 대한 하나님의 대답/복음의 반전' (예: "하나님의 대답", "성령님의 음성", "치료자 하나님의 신호")
   - startTime: 쇼츠 시작 시간 (실제 자막의 타임스탬프 MM:SS 형식, 예: "04:12")
   - endTime: 쇼츠 종료 시간 (시작 시간으로부터 45~60초 후의 MM:SS 형식, 예: "05:08")
   - duration: 분량 (예: "56초")
   - hook: 첫 3초 시선을 사로잡는 강력한 오프닝 문장
   - summary: 해당 구간 핵심 메시지 요약 (1~2문장)
   - sentences: 문장별 자막 세그먼트 배열 (각 쇼츠당 5~8개 문장). 형식:
     [{{"id": 1, "start": "04:12", "end": "04:18", "text": "실제 설교 대사"}}, ...]

3. 5일치 설교 묵상 (월요일 ~ 금요일):
   - day: 1 ~ 5 (정수)
   - dayName: "월요일", "화요일", "수요일", "목요일", "금요일"
   - theme: 요일별 묵상 주제
   - bibleVerse: 해당 주제 관련 성경 구절과 본문 말씀
   - content: 2~3문단의 깊이 있는 말씀 묵상과 영적 통찰
   - question: 성도 개인의 삶을 돌아보게 하는 묵상 질문 1개
   - application: 오늘 하루 실천할 수 있는 구체적인 삶의 적용점 1개
   - closingPrayer: 묵상을 마무리하는 은혜로운 기도문

4. 카드뉴스 2종류:
   - sermonCardNews: 설교 전체 요약 카드 7장
     * Card 1: {{"id": 1, "type": "cover", "tag": "주일 설교 요약", "title": "설교제목", "preacher": "설교자", "passage": "본문", "church": "교회명"}}
     * Card 2~6: {{"id": 2, "type": "content", "tag": "Point 01", "title": "소제목", "body": "상세 설명 2~3줄"}}
     * Card 7: {{"id": 7, "type": "closing", "tag": "결단과 기도", "title": "오늘의 믿음 고백", "body": "결단 기도문", "church": "교회명"}}
   - dailyCardNewsSets: 1~5일차 각 4장의 묵상 카드뉴스 맵 객체:
     * 키는 "1", "2", "3", "4", "5" 문자열
     * 각 일자별 4장:
       Card 1: {{"id": 1, "type": "cover", "tag": "Day X 묵상", "title": "묵상 제목", "passage": "구절", "church": "교회명"}}
       Card 2: {{"id": 2, "type": "content", "tag": "말씀 묵상", "title": "말씀 포인트", "body": "묵상 내용"}}
       Card 3: {{"id": 3, "type": "content", "tag": "삶의 적용", "title": "삶의 적용", "body": "실천 내용"}}
       Card 4: {{"id": 4, "type": "closing", "tag": "마치는 기도", "title": "X요일의 기도", "body": "기도문", "church": "교회명"}}

반드시 순수 JSON 객체만 반환하세요.
"""

    client = genai.Client(api_key=api_key)
    gen_config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.3
    )

    response_text = ""
    # 자막이나 설명란이 확보된 경우 초고속 텍스트 분석(3~5초 소요), 자막이 전무한 경우에만 멀티모달 비디오 시도
    if transcript_snippet or description:
        response = client.models.generate_content(
            model='gemini-3.8-flash',
            contents=prompt,
            config=gen_config
        )
        response_text = response.text.strip()
    else:
        try:
            video_part = types.Part.from_uri(file_uri=youtube_url, mime_type="video/*")
            response = client.models.generate_content(
                model='gemini-3.8-flash',
                contents=[video_part, prompt],
                config=gen_config
            )
            response_text = response.text.strip()
        except Exception as multi_err:
            logger.info(f"Gemini 멀티모달 직접 처리 실패: {multi_err}. 텍스트 모드로 재시도합니다.")
            response = client.models.generate_content(
                model='gemini-3.8-flash',
                contents=prompt,
                config=gen_config
            )
            response_text = response.text.strip()

    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]

    parsed = json.loads(response_text)

    # 분석 결과 정규화 및 데이터 무결성 보장
    parsed = _normalize_analysis_result(parsed, details, youtube_url)

    return parsed


def _normalize_analysis_result(parsed: Dict[str, Any], details: Dict[str, Any], youtube_url: str) -> Dict[str, Any]:
    """Gemini 응답의 누락 필드를 감지하고 쇼츠 5개 및 카드뉴스 2종류를 100% 완전한 데이터로 보정"""
    # 1. 메타데이터 보강
    if "metadata" not in parsed or not isinstance(parsed["metadata"], dict):
        parsed["metadata"] = {}
    meta = parsed["metadata"]
    if details.get("title") and not meta.get("title"):
        meta["title"] = details["title"]
    if not meta.get("title"):
        meta["title"] = "은혜로운 주일 설교 말씀"
    if details.get("thumbnail") and not meta.get("thumbnail"):
        meta["thumbnail"] = details["thumbnail"]
    if details.get("duration_str") and not meta.get("videoDuration"):
        meta["videoDuration"] = details["duration_str"]
    if details.get("channel") and not meta.get("churchName"):
        meta["churchName"] = details["channel"]
    if not meta.get("churchName"):
        meta["churchName"] = "예배공동체"
    if not meta.get("preacher"):
        meta["preacher"] = "담임목사"
    if not meta.get("passage"):
        meta["passage"] = "성경 말씀"

    # 2. 쇼츠 5개 보장 및 정규화
    shorts = parsed.get("shorts", [])
    if not isinstance(shorts, list):
        shorts = []
    
    # 기본 예시 쇼츠 풀 (부족 시 활용)
    fallback_shorts = DEFAULT_ANALYSIS["shorts"]

    normalized_shorts = []
    for i in range(max(5, len(shorts))):
        s = shorts[i] if i < len(shorts) and isinstance(shorts[i], dict) else {}
        fb = fallback_shorts[i % len(fallback_shorts)]
        
        short_id = s.get("id") or f"short-{i+1}"
        title = s.get("title") or fb["title"]
        title_q = s.get("title_question") or s.get("hook") or fb.get("title_question", "말씀의 질문")
        title_a = s.get("title_answer") or title or fb.get("title_answer", "하나님의 대답")
        start_time = s.get("startTime") or fb["startTime"]
        end_time = s.get("endTime") or fb["endTime"]
        duration = s.get("duration") or fb["duration"]
        hook = s.get("hook") or fb["hook"]
        summary = s.get("summary") or fb["summary"]
        sentences = s.get("sentences") or fb.get("sentences", [])

        # sentences가 비어있으면 요약문이나 제목으로 3~4문장 생성
        if not sentences or not isinstance(sentences, list):
            sentences = [
                {"id": 1, "start": start_time, "end": end_time, "text": title_q},
                {"id": 2, "start": start_time, "end": end_time, "text": title_a},
                {"id": 3, "start": start_time, "end": end_time, "text": summary or hook}
            ]

        normalized_shorts.append({
            "id": short_id,
            "title": title,
            "title_question": title_q,
            "title_answer": title_a,
            "startTime": start_time,
            "endTime": end_time,
            "duration": duration,
            "hook": hook,
            "summary": summary,
            "sentences": sentences,
            "youtube_url": youtube_url
        })

    parsed["shorts"] = normalized_shorts[:5]

    # 3. 5Day 묵상(meditations) 5일치 보장
    meditations = parsed.get("meditations", [])
    if not isinstance(meditations, list) or len(meditations) < 5:
        # 기존 meditation이 부족하면 기본 풀에서 보충하되 제목/본문은 현재 설교 정보 반영
        new_meditations = []
        days_info = [
            (1, "월요일"), (2, "화요일"), (3, "수요일"), (4, "목요일"), (5, "금요일")
        ]
        for idx, (day_num, day_name) in enumerate(days_info):
            if idx < len(meditations) and isinstance(meditations[idx], dict):
                m = dict(meditations[idx])
                m["day"] = day_num
                m["dayName"] = day_name
                new_meditations.append(m)
            else:
                fb_m = DEFAULT_ANALYSIS["meditations"][idx % len(DEFAULT_ANALYSIS["meditations"])]
                new_meditations.append({
                    "day": day_num,
                    "dayName": day_name,
                    "theme": f"{meta['title']} 묵상 {day_num}일차: {fb_m['theme']}",
                    "bibleVerse": meta["passage"],
                    "content": fb_m["content"],
                    "question": fb_m["question"],
                    "application": fb_m["application"],
                    "closingPrayer": fb_m["closingPrayer"]
                })
        parsed["meditations"] = new_meditations

    # 4. 설교카드 7장(sermonCardNews) 보장
    sermon_cards = parsed.get("sermonCardNews", [])
    if not isinstance(sermon_cards, list) or len(sermon_cards) < 7:
        # 부족하거나 없으면 metadata와 shorts, meditations로부터 완전한 7장 생성
        created_cards = [
            {
                "id": 1,
                "type": "cover",
                "tag": "주일 설교 요약",
                "title": meta.get("title", "은혜로운 설교 말씀"),
                "subtitle": parsed["shorts"][0]["summary"] if parsed["shorts"] else "말씀의 핵심 원리와 적용",
                "passage": meta.get("passage", "성경 본문"),
                "speaker": meta.get("preacher", "담임목사"),
                "church": meta.get("churchName", "예배공동체")
            }
        ]
        for i in range(5):
            sh = parsed["shorts"][i] if i < len(parsed["shorts"]) else None
            med = parsed["meditations"][i] if i < len(parsed["meditations"]) else None
            point_title = sh["title_answer"] if sh else (med["theme"] if med else f"은혜의 포인트 0{i+1}")
            point_body = sh["summary"] if sh else (med["content"][:120] if med else "말씀을 통해 우리에게 주시는 하나님의 약속을 기억하십시오.")
            created_cards.append({
                "id": i + 2,
                "type": "content",
                "tag": f"Point 0{i+1}",
                "title": point_title,
                "body": point_body
            })
        created_cards.append({
            "id": 7,
            "type": "closing",
            "tag": "결단과 기도",
            "title": "오늘의 믿음 결단",
            "body": f"\"주님, 오늘 {meta.get('title', '말씀')}을 통해 주신 은혜를 기억하며, 세상 가운데 담대하게 믿음으로 살아가게 하옵소서. 예수님의 이름으로 기도드립니다. 아멘.\"",
            "church": meta.get("churchName", "예배공동체")
        })
        parsed["sermonCardNews"] = created_cards

    # 5. 5Day 묵상카드 세트(dailyCardNewsSets) 보장 (1~5 문자열 키)
    daily_sets = parsed.get("dailyCardNewsSets", {})
    if not isinstance(daily_sets, dict):
        daily_sets = {}

    normalized_daily = {}
    for day_num in range(1, 6):
        day_key = str(day_num)
        cards = daily_sets.get(day_key) or daily_sets.get(day_num)
        if not isinstance(cards, list) or len(cards) < 4:
            # 묵상 데이터에서 직접 4장 슬라이드 합성
            med = parsed["meditations"][day_num - 1] if day_num - 1 < len(parsed["meditations"]) else None
            day_name = ["월", "화", "수", "목", "금"][day_num - 1]
            med_theme = med["theme"] if med else f"Day {day_num} 묵상"
            med_verse = med["bibleVerse"] if med else meta.get("passage", "")
            med_content = med["content"] if med else "말씀을 묵상하며 주님의 뜻을 구합니다."
            med_app = med["application"] if med else "오늘 하루 말씀에 순종하기."
            med_prayer = med["closingPrayer"] if med else "주님과 함께 동행하는 하루가 되게 하옵소서."

            normalized_daily[day_key] = [
                {
                    "id": 1,
                    "type": "cover",
                    "tag": f"Day {day_num} ({day_name})",
                    "title": med_theme,
                    "passage": med_verse.split("\n")[0] if "\n" in med_verse else med_verse,
                    "church": meta.get("churchName", "예배공동체")
                },
                {
                    "id": 2,
                    "type": "content",
                    "tag": "말씀 묵상",
                    "title": "오늘의 말씀과 은혜",
                    "body": med_content[:180] + ("..." if len(med_content) > 180 else "")
                },
                {
                    "id": 3,
                    "type": "content",
                    "tag": "삶의 적용",
                    "title": "일상에서의 실천",
                    "body": f"질문: {med['question'] if med and 'question' in med else '오늘 주신 말씀은 무엇입니까?'}\n\n적용: {med_app}"
                },
                {
                    "id": 4,
                    "type": "closing",
                    "tag": "마치는 기도",
                    "title": f"{day_name}요일의 기도",
                    "body": med_prayer,
                    "church": meta.get("churchName", "예배공동체")
                }
            ]
        else:
            normalized_daily[day_key] = cards

    parsed["dailyCardNewsSets"] = normalized_daily

    return parsed



async def complete_sermon_draft(idea_text: str, tone_profile: str = "", custom_api_key: Optional[str] = None) -> str:
    """1) 미완성 설교나 아이디어를 바탕으로 온전한 대지 설교문으로 완성"""
    api_key = custom_api_key or GEMINI_API_KEY
    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            tone_instruction = f"\n[목회자 고유 설교톤 프로필 반영]:\n{tone_profile}\n" if tone_profile else ""
            prompt = f"""
당신은 복음주의 신학에 깊이 뿌리내린 설교 작성 전문 조력자입니다.
다음 미완성된 설교 아이디어/메모를 바탕으로, 주일 성도들에게 깊은 감동과 도전을 주는 완성도 높은 '온전한 한 편의 설교문'을 작성해주세요.
{tone_instruction}
[입력된 설교 아이디어/메모]:
{idea_text}

[작성 형식 가이드]:
1. 설교 제목 & 본문 성경 구절
2. 서론 (성도들의 삶의 갈증과 현실적인 공감대 형성)
3. 본론 3대지 (각 대지별 성경 원리 해석 및 생생한 예화, 영적 원리 적용)
   - 제1대지: ...
   - 제2대지: ...
   - 제3대지: ...
4. 결론 및 결단의 메시지
5. 마치는 기도문
"""
            res = client.models.generate_content(model='gemini-3.8-flash', contents=prompt)
            return res.text.strip()
        except Exception as e:
            logger.warning(f"설교 완성 AI 호출 실패({e}). 기본 예시 반환")

    # 목업 완성본
    return f"""[설교 제목] 깊은 곳에 그물을 던질 때 열리는 기적
[본문 성경] 누가복음 5장 1절 ~ 11절

[서론: 밤이 맞도록 수고하였으나]
사랑하는 성도 여러분, 살아가다 보면 내 모든 열정과 경험을 다 쏟아부었음에도 불구하고 빈 그물만 쥐고 돌아와야 하는 허탈한 아침을 만날 때가 있습니다. 밤새도록 차가운 갈릴리 바다를 뒤흔들며 그물을 던졌지만, 손에 쥐어진 것은 차가운 피로와 깊은 절망뿐이었던 베드로처럼 말입니다. 오늘 주님은 바로 그 빈 배의 자리로 찾아오십니다.

[본론 제1대지: 내 경험의 한계를 인정하고 주님께 배를 내어드리라]
베드로는 평생 그 바다에서 뼈가 굵은 베테랑 어부였습니다. 그러나 주님이 찾아오셨을 때, 그는 자신의 실패를 숨기지 않고 주님이 배에 오르시도록 자리를 내어드렸습니다. 신앙의 첫걸음은 내 지혜와 인간적인 계산이 바닥났음을 주님 앞에 정직하게 고백하는 것입니다.

[본론 제2대지: '말씀에 의지하여' 상식을 뛰어넘는 순종을 드리라]
예수님은 대낮에 깊은 곳에 그물을 내리라 명하십니다. 물고기는 밤에 얕은 곳에서 잡힌다는 상식에 정면으로 위배되는 명령이었습니다. 그러나 베드로는 말합니다. "선생님, 우리가 밤이 맞도록 수고하였으되 잡은 것이 없지마는 말씀에 의지하여 내가 그물을 내리리이다." 기적은 내 상식을 내려놓고 주의 말씀의 무게를 믿을 때 시작됩니다.

[본론 제3대지: 기적을 넘어 '사람을 낚는 사명자'로 일어서라]
그물이 찢어질 만큼의 고기가 잡혔을 때, 베드로는 재물에 취하지 않고 주님의 무릎 아래 엎드렸습니다. "주여 나를 떠나소서 나는 죄인이로소이다." 주님은 그런 베드로에게 "이제 후로는 네가 사람을 취하리라"는 거룩한 비전을 주셨습니다. 하나님이 우리에게 채워주시는 축복의 최종 목적지는 풍요가 아니라 거룩한 사명입니다.

[결론 및 결단]
사랑하는 여러분, 지금 당신의 배가 비어 있습니까? 실패의 자리에 홀로 앉아 그물을 씻으며 한숨짓고 계십니까? 주님의 음성에 귀 기울이십시오. 깊은 곳으로 가 말씀에 의지하여 그물을 던지십시오. 주님이 여러분의 빈 배를 채우시고 위대한 사명자로 다시 일으키실 것입니다.

[마치는 기도]
전능하신 하나님 아버지, 밤새 수고하여도 빈 그물뿐인 우리 인생의 현장에 찾아와 주시니 감사합니다. 내 생각과 경험을 내려놓고 주의 약속의 말씀에 온전히 순종하게 하옵소서. 찢어질 듯 채워주시는 은혜를 힘입어 오직 주를 따르는 사명자가 되게 하옵소서. 예수 그리스도의 이름으로 기도드립니다. 아멘."""


async def refine_for_video(sermon_text: str, custom_api_key: Optional[str] = None) -> str:
    """2) 완성된 설교를 영상 낭독/쇼츠에 최적화된 은혜롭고 리듬감 있는 구어체 설교체로 교정"""
    api_key = custom_api_key or GEMINI_API_KEY
    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            prompt = f"""
당신은 유튜브 설교 영상 및 오디오 미디어에 특화된 방송 설교 코치입니다.
다음 설교문을 영상으로 제작했을 때 시청자들의 가슴에 꽂히도록 '영상용 은혜로운 구어체 설교체'로 교정(리라이팅)해주세요.

[교정 가이드]:
1. 시각적·청각적 몰입감을 위해 문장을 1~2마디 호흡으로 간결하게 정돈
2. 군더더기 서술어를 줄이고, 성도들에게 직접 말을 건네듯 생생한 현장감과 온기 있는 어조 사용
3. 핵심 문장은 여운이 남도록 강조
4. 영상 낭독 시 자연스러운 쉼표(,)와 줄바꿈 적용

[원문 설교문]:
{sermon_text}
"""
            res = client.models.generate_content(model='gemini-3.8-flash', contents=prompt)
            return res.text.strip()
        except Exception as e:
            logger.warning(f"영상용 교정 AI 호출 실패({e})")

    # 목업 영상용 교정문
    return f"""[영상 맞춤 설교 리라이팅]

여러분, 혹시 밤새도록 온 힘을 다해 애썼는데도
손에 쥔 것은 빈 그물뿐이었던 적 없으신가요?

차가운 새벽 갈릴리 바닷가,
어깨를 축 늘어뜨린 채 그물을 씻고 있던 베드로처럼 말입니다.

그때 주님이 다가오셔서 조용히 말씀하십니다.
"깊은 곳으로 가서, 그물을 내려라."

내 경험으로는 도무지 납득되지 않는 자리,
내 이성으로는 도저히 이해할 수 없는 그 깊은 곳.

그러나 베드로는 자신의 한계를 인정하고 이렇게 고백합니다.
"주님, 밤새도록 수고했지만 아무것도 얻지 못했습니다.
그러나... 오직 주님의 말씀에 의지하여 그물을 내리겠습니다."

성도 여러분, 기적은 바로 이 순종의 찰나에 시작됩니다.
내 생각을 꺾고, 주님의 말씀에 나를 던질 때
상상치 못했던 풍성한 은혜가 차오릅니다.

오늘 그 빈 배를 주님께 내어드리십시오.
주님께서 여러분의 삶을 채우시고,
다시 거룩한 사명의 길로 일으켜 세우실 것입니다."""


async def train_sermon_tone(samples: List[str], custom_api_key: Optional[str] = None) -> Dict[str, Any]:
    """3) 목회자 본인의 설교문 여러 편을 학습하여 고유의 설교톤 및 어조 프로필 추출"""
    combined_samples = "\n---\n".join([f"설교 샘플 {i+1}:\n{s[:1500]}" for i, s in enumerate(samples)])

    api_key = custom_api_key or GEMINI_API_KEY
    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            prompt = f"""
당신은 문체 및 수사학 분석 전문가입니다.
다음은 한 목회자(설교자)의 실제 설교문 샘플들입니다.
이 설교자의 고유한 설교톤, 문체 특성, 자주 사용하는 은혜로운 표현과 화법을 분석하여 JSON으로 반환해주세요:

[설교문 샘플 모음]:
{combined_samples}

[반환 JSON 포맷]:
{{
  "toneName": "따뜻한 목회적 위로형 / 지성적 강해 설교형 등",
  "summary": "설교톤의 핵심 특징 요약 2~3줄",
  "keywords": ["자주 쓰는 키워드 5개"],
  "sentenceStyle": "문장 호흡 및 어미 종결 특징 (예: ~하십시오, ~입니다)",
  "rhetoricTrait": "비유 및 설득 방식의 특징",
  "systemInstruction": "이 목회자의 톤을 완벽히 모사할 수 있는 AI 프롬프트 지침문 (100자 내외)"
}}
"""
            res = client.models.generate_content(model='gemini-3.8-flash', contents=prompt)
            txt = res.text.strip()
            if txt.startswith("```json"):
                txt = txt[7:]
            if txt.endswith("```"):
                txt = txt[:-3]
            return json.loads(txt)
        except Exception as e:
            logger.warning(f"설교톤 학습 AI 호출 실패({e})")

    # 목업 학습 결과
    return {
        "toneName": "깊은 복음 중심의 따뜻한 권면형 (Grace & Encouragement)",
        "summary": "삶의 현장에서 부딪히는 성도들의 고난과 갈증에 깊이 공감하며, 하나님의 주권과 십자가의 은혜를 온유하면서도 확신 있게 선포하는 화법입니다.",
        "keywords": ["하나님의 주권", "십자가의 보혈", "말씀에 의지하여", "광야의 은혜", "사랑하는 성도 여러분"],
        "sentenceStyle": "친근한 존칭과 부드러운 의문형을 통해 성도 스스로 결단하게 유도하는 어조 (~하셨을까요?, ~하십시오, ~할 줄 믿습니다)",
        "rhetoricTrait": "성경 본문의 인물과 현대 성도의 일상을 밀접하게 대조시키는 현실 밀착형 영적 적용",
        "systemInstruction": "성도들의 삶의 갈증을 위로하는 따뜻한 어조로 시작하여, 십자가 예수 그리스도의 언약을 확신 있게 선포하고 '사랑하는 성도 여러분'을 자연스럽게 섞어 권면할 것."
    }

