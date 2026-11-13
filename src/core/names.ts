import { pick, type Rng } from "./rng";
const adjectives =
  "포근한 느긋한 다정한 조용한 따뜻한 씩씩한 수줍은 반짝이는 졸린 상냥한 명랑한 차분한 보송한 꼼꼼한 산뜻한".split(
    " ",
  );
const nouns =
  "다람쥐 수달 고슴도치 너구리 펭귄 부엉이 사슴 토끼 해달 참새 들꽃 민들레 해바라기 동백 수선화 은방울꽃 코스모스 개나리".split(
    " ",
  );
export const randomName = (rng: Rng) =>
  `${pick(rng, adjectives)} ${pick(rng, nouns)}`;
