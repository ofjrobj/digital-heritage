# Gongju Mok Stone Lions

공주목 석사자 최종 웹사이트와 Blender 테스트를 보관하는 폴더입니다.

| 위치 | 내용 |
| --- | --- |
| `index.html` | 최종 Story |
| `archive/` | Index, 두 석사자 3D 모델·텍스처·뷰어 |
| `about/` | 기획·제작 과정, 클릭해서 보는 제작 자료 |
| `assets/` | 최종 Story와 Index에서 사용하는 공통 코드·이미지·폰트·음성 |
| `media/` | 최종 영상과 환경음 |
| `selected-media.json` | Story에서 사용하는 영상 연결 목록 |
| `blender-test/` | Blender 지형·건축물·인물이 적용된 테스트 |
| `blender-test/assets/` | Blender 테스트 전용 모델·코드·자료 |

## 실행 및 배포

이 폴더에서 `python3 -m http.server 8790`을 실행하고
`http://localhost:8790/`을 여세요. HTML을 더블클릭하는 방식은 사용하지 않습니다.

GitHub 저장소: `ofjrobj/digital-heritage`, 배포 브랜치: `gh-pages`.
이 폴더를 저장소의 `gongju-mok-stone-lions/`에 배치합니다.

- 최종 사이트: https://ofjrobj.github.io/digital-heritage/gongju-mok-stone-lions/
- Blender 테스트: https://ofjrobj.github.io/digital-heritage/gongju-mok-stone-lions/blender-test/
- 기존 `/gongju-mok/`, `/gongju-mok/archive/`, `/gongju-mok/about/`, `/play.html`은 새 위치로 이동합니다.

## 자료의 실제 연결

대부분의 자료는 위 폴더 안에 있습니다. 일부 최종 영상은
`selected-media.json`에 지정된 Higgsfield CloudFront 주소에서 직접 재생합니다.
원본 Google Drive 링크는 제작 자료의 출처이며, 사이트 이미지의 로딩 경로가 아닙니다.
Desktop·Downloads·Google Drive의 원본 작업 자료는 이 정리의 삭제 대상이 아닙니다.

정리 전 배포는 Git 커밋 `0e74c38a6789173cdf8a882af79faf403da66ad2`에서 복구할 수 있습니다.
