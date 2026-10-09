export const dialogueCopy=[
  {
    "place": "제금루 製錦樓",
    "role": "공주목을 드나드는 장사꾼",
    "context": "관아의 출입을 통제하던 문루",
    "intro": "이 문을 지나면 관아입니다. 장에 물건을 내다 팔러 올 때면 이 앞을 지나곤 하지요. 이곳을 오가는 사람은 참 많습니다.",
    "testimony": "근처에 돌짐승 암수 한 쌍이 있는데요. 수사자는 암사자보다 얼굴 덩치도 훨씬 크고, 눈꼬리가 위로 팍 올라간 게 눈매가 어찌나 사나운지 진짜 살아있는 놈 같더라고요."
  },
  {
    "place": "동헌 · 혜의당 惠義堂",
    "role": "논밭 일로 관아를 찾은 농민",
    "context": "공주목사가 공적인 행정을 처리하던 공간",
    "intro": "나는 논밭 일로 왔습니다. 내 땅이라 생각했던 곳의 경계가 달라졌으니, 관아에 와서 사정을 이야기해야 하지요.",
    "testimony": "어제 그 돌짐승을 보았는데, 암사자의 얼굴이 흐릿하여 눈을 비비고 자세히 살펴보니 이목구비와 얼굴 윤곽이 또렷하게 살아나더군요. 눈앞에 선명해지니 금방이라도 말을 건넬 것 같았습니다."
  },
  {
    "place": "객사 客舍",
    "role": "손님들의 음식을 마련하던 찬모",
    "context": "왕의 궐패를 모시고 관리들이 머물던 공간",
    "intro": "객사에는 먼 곳에서 온 손님들이 머무릅니다. 음식을 마련하는 것도 제 일이지요. 좋은 것들을 골라 상에 올렸습니다.",
    "testimony": "객사 근처에 있는 두 돌짐승을 유심히 봤는데요. 전체적인 형태부터 보통 돌이 아니더군요. 특히 위엄 있고 익살스러운 얼굴에, 닳은 줄 알았던 정수리의 꼬불꼬불한 갈기 굴곡까지 하나하나 입체적으로 살아나는 게 참 신통했습니다."
  },
  {
    "place": "민가",
    "role": "공주에 사는 주민 삼총사",
    "context": "사람들이 살고 일하던 관아 밖의 집들",
    "intro": "우리에게 하루는 늘 비슷했습니다. 서로 투닥거리다 집으로 돌아가지요. 큰일이 있는 날보다 아무 일 없는 날이 더 많았습니다.",
    "testimony": "자세히 보니 석상들 표정이 참 생생합디다. 입꼬리가 살짝 올라가 사람이 씩 웃는 것 같은 데다, 대각선으로 쭉 뻗은 수염은 꼭 빛이 퍼져 나가는 것 같았지요. 돌로 만든 건데도 그 생생한 표정과 조형에서 아주 신비한 기운이 풍기더군요."
  },
  {
    "place": "공주의 뒷산",
    "role": "마을과 산을 오가는 나무꾼",
    "context": "관아와 마을을 둘러싼 생활의 공간",
    "intro": "산에 오르면 관아도 집도 사람들이 오가는 길도 한눈에 들어옵니다. 떨어져 보이던 곳들이 하나로 이어지지요.",
    "testimony": "가까이 보니 등 전체에 새겨진 털 결이 꼭 산등성이 굽이처럼 선명하게 살아있더라고요. 그 입체적인 결을 짚고 있자니, 당장이라도 산을 타넘을 것만 같았습니다."
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
