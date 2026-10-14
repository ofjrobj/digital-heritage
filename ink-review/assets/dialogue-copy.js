export const dialogueCopy=[
  {
    "place": "제금루 製錦樓",
    "role": "공주목을 드나드는 장사꾼",
    "context": "관아의 출입을 통제하던 문루",
    "intro": "이 문을 지나면 관아입니다. 장에 물건을 내다 팔러 올 때면 이 앞을 지나곤 하지요. 이곳을 오가는 사람은 참 많습니다.",
    "testimony": "장터에 가는 길에 제금루에서 들었는데, 당나라에 다녀온 사신 편에 사자라는 희귀한 짐승 한 쌍에 대한 소문이 파다하더이다. 수놈이 암놈보다 얼굴, 덩치도 훨씬 크고, 눈꼬리가 위로 팍 올라간 게 눈매가 어찌나 사나운지, 바로 달려들 것 같았다지 뭡니까."
  },
  {
    "place": "동헌 · 혜의당 惠義堂",
    "role": "토지 문제로 관아를 찾아온 농민",
    "context": "공주목사가 공적인 행정을 처리하던 공간",
    "intro": "나는 논밭 일로 왔습니다. 내 땅이라 생각했던 곳의 경계가 달라졌으니, 관아에 와서 사정을 이야기해야 하지요.",
    "testimony": "어제 관아에서 일을 보고 돌아오는 길에 저도 그 희귀한 짐승 한 쌍에 대한 소문을 들었는데요. 한 놈의 얼굴이 흐릿하여 눈을 비비고 자세히 살펴보니, 이목구비와 얼굴 윤곽이 또렷하게 살아났다더군요. 금방이라도 말을 건넬 것 같은 모습이었답니다."
  },
  {
    "place": "객사터 客舍",
    "role": "객사 주변을 오가던 찬모",
    "context": "왕의 궐패를 모시고 관리들이 머물던 공간",
    "intro": "객사에는 먼 곳에서 온 손님들이 머무릅니다. 음식을 마련하는 것도 제 일이지요. 좋은 것들을 골라 상에 올렸습니다.",
    "testimony": "저도 객사에 음식을 하러 가는 길에 소문을 들었지요. 고것이 글쎄, 위엄 있고 익살스러운 얼굴에, 정수리의 꼬불꼬불한 갈기까지 한 올 한 올 날리는 것이 참으로 신통했다네요."
  },
  {
    "place": "민가",
    "role": "공주에 사는 평범한 주민 삼총사",
    "context": "사람들이 살고 일하던 관아 밖의 집들",
    "intro": "우리에게 하루는 늘 비슷했습니다. 서로 투닥거리다 집으로 돌아가지요. 큰일이 있는 날보다 아무 일 없는 날이 더 많았습니다.",
    "testimony": "여느 때처럼 서로 투닥거리며 집에 돌아가는 길에 저도 그 희귀한 짐승에 대한 소문을 들었어요. 생생한 얼굴 표정에서 신비한 기운이 났다고 합니다. 입꼬리가 살짝 올라가 사람이 씩 웃는 것 같은 데다, 사방으로 쭉 뻗은 수염은 꼭 빛이 퍼져 나가는 듯했다지요."
  },
  {
    "place": "뒷산",
    "role": "산을 오가는 나무꾼",
    "context": "관아와 마을을 둘러싼 생활의 공간",
    "intro": "산에 오르면 관아도 집도 사람들이 오가는 길도 한눈에 들어옵니다. 떨어져 보이던 곳들이 하나로 이어지지요.",
    "testimony": "어제 봉황산에 나무를 하러 갔는데, 동료 나무꾼이 그 희귀한 짐승에 대한 소문을 들려주더군요. 털 결이 꼭 산등성이 굽이처럼 선명하게 살아있는게, 산과 꼭 닮은 것이 꼭 산신의 사자가 내려온 것 같았다네요."
  }
];

// Short timed captions preserve the approved wording without a scrolling text box.
// Authored phrase boundaries keep each caption readable without truncating the script.
export function dialoguePages(index){
 const breaks=['눈꼬리가 위로 팍 올라간 게 눈매가 어찌나 사나운지','암사자의 얼굴이 흐릿하여 눈을 비비고 자세히 살펴보니','닳은 줄 알았던 정수리의 꼬불꼬불한 갈기 굴곡까지','가까이 보니 등 전체에 새겨진 털 결이','입꼬리가 살짝 올라가 사람이 씩 웃는 것 같은 데다,'];
 return [dialogueCopy[index].intro,dialogueCopy[index].testimony].flatMap(text=>{
  for(const phrase of breaks)text=text.replace(phrase,phrase+'\n');
  return (text.match(/[^.!?\n]+[.!?]?/g)||[]).map(text=>text.trim()).filter(Boolean).map(text=>({text,seconds:Math.max(5,text.length/6)}));
 });
}
