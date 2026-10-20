// Image filename, alternative text, and caption. Team-supplied production materials.
const processGalleries = [
  {
    "id": "research",
    "title": "스토리보드와 UX 설계",
    "items": [
      [
        "storyboard.png",
        "이동 순서와 화면별 조작을 정리한 스토리보드",
        "사자 얼굴의 먹선에서 마을 이야기와 인덱스로 이어지는 장면 구성입니다."
      ]
    ]
  },
  {
    "id": "scan",
    "title": "스캔 데이터와 ZBrush 작업",
    "items": [
      [
        "scan-artec.png",
        "Artec Studio의 석사자 스캔 데이터 작업 화면",
        "Artec Studio에서 석사자의 입체 형태와 표면 데이터를 확인한 작업 화면입니다."
      ],
      [
        "scan-zbrush.png",
        "ZBrush의 수사자 모델과 펼쳐진 텍스처 맵",
        "ZBrush에서 모델의 표면과 텍스처 맵을 정리한 작업 화면입니다."
      ]
    ]
  },
  {
    "id": "space",
    "title": "Blender 공간과 애니메이션",
    "items": [
      [
        "space-blender.png",
        "공주목의 지형과 주요 건축물을 배치한 Blender 조감도",
        "금강과 제민천, 공산성, 객사와 민가의 상대적인 배치를 정리한 3D 공간입니다."
      ],
      [
        "space-illustration.png",
        "공주목 공간을 수묵화풍으로 표현한 조감도",
        "공간 배치를 바탕으로 그림체와 풍경의 분위기를 확인한 이미지입니다."
      ],
      [
        "frames-blender.jpg",
        "장면 순서에 따라 배열한 Blender 초안 전체",
        "Blender 초안 · 마을 진입, 인물과의 대화, 석사자와 마지막 장면까지 카메라 구도와 이동 순서를 검토한 장면 모음입니다."
      ],
      [
        "merchant-blockout.jpeg",
        "장사꾼 대화 장면의 Blender 초기 화면",
        "같은 대화 장면의 초기 3D 구성입니다. 인물 크기와 화면 위치, 건축물과 대사 영역의 관계를 확인했습니다."
      ]
    ]
  },
  {
    "id": "style",
    "title": "어셋과 스타일 프레임",
    "items": [
      [
        "cast-merchant.png",
        "장사꾼 인물 설정화",
        "01 장사꾼 · 지게와 짐, 옷차림을 앞·옆·뒤에서 확인한 설정화입니다."
      ],
      [
        "cast-farmer.png",
        "농민 인물 설정화",
        "02 농민 · 손에 든 문서와 조끼, 자세를 여러 방향으로 정리했습니다."
      ],
      [
        "cast-cook.png",
        "찬모 인물 설정화",
        "03 찬모 · 앞치마와 소반, 그릇을 포함해 인물의 역할이 드러나도록 구성했습니다."
      ],
      [
        "cast-trio.png",
        "주민 삼총사 인물 설정화",
        "04 주민 삼총사 · 바구니와 책, 소품과 몸짓으로 세 인물을 구분한 설정화입니다."
      ],
      [
        "cast-woodcutter.png",
        "나무꾼 인물 설정화",
        "05 나무꾼 · 장작을 실은 지게와 도끼, 옷차림을 여러 방향으로 확인했습니다."
      ],
      [
        "villagers-01.png",
        "마을 주민의 생활 동작 설정 자료 1",
        "주민 자료 1 · 일하고 대화하며 생활하는 여러 인물의 자세와 소품을 정리한 제작 시트입니다."
      ],
      [
        "villagers-02.png",
        "마을 주민의 생활 동작 설정 자료 2",
        "주민 자료 2 · 일하고 대화하며 생활하는 여러 인물의 자세와 소품을 정리한 제작 시트입니다."
      ],
      [
        "villagers-03.png",
        "마을 주민의 생활 동작 설정 자료 3",
        "주민 자료 3 · 일하고 대화하며 생활하는 여러 인물의 자세와 소품을 정리한 제작 시트입니다."
      ],
      [
        "villagers-04.png",
        "마을 주민의 생활 동작 설정 자료 4",
        "주민 자료 4 · 일하고 대화하며 생활하는 여러 인물의 자세와 소품을 정리한 제작 시트입니다."
      ],
      [
        "villagers-05.png",
        "마을 주민의 생활 동작 설정 자료 5",
        "주민 자료 5 · 일하고 대화하며 생활하는 여러 인물의 자세와 소품을 정리한 제작 시트입니다."
      ],
      [
        "villagers-06.png",
        "마을 주민의 생활 동작 설정 자료 6",
        "주민 자료 6 · 일하고 대화하며 생활하는 여러 인물의 자세와 소품을 정리한 제작 시트입니다."
      ],
      [
        "trees-near.png",
        "나무 자료 T01–T10",
        "나무의 수형과 잎, 가지의 차이를 정리한 첫 번째 풍경 자료입니다."
      ],
      [
        "trees-middle.png",
        "나무 자료 T11–T20",
        "형태가 서로 다른 나무들을 모아 마을과 길 주변 풍경을 구성한 두 번째 자료입니다."
      ],
      [
        "trees-far.png",
        "원경 나무 자료 T21–T30",
        "먼 풍경에 어울리도록 색과 윤곽을 옅게 정리한 나무 자료입니다."
      ],
      [
        "village-cat.png",
        "마을 고양이의 세 가지 자세",
        "한 고양이의 앉기·웅크리기·걷기 모습을 정리해 장면이 바뀌어도 같은 개체로 이어지도록 만든 자료입니다."
      ],
      [
        "frames-final.jpg",
        "수묵화풍을 적용한 최종 스타일 프레임 전체",
        "최종 스타일 프레임 · 초기 공간과 동선을 바탕으로 인물·건축·풍경의 그림체와 시간대별 분위기를 구체화한 장면 모음입니다."
      ]
    ]
  },
  {
    "id": "motion",
    "title": "Higgsfield 영상 제작",
    "items": [
      [
        "motion-planning-board.png",
        "Higgsfield 영상 제작을 위한 장면별 참고 이미지와 프롬프트 보드",
        "Higgsfield 영상 제작용 보드입니다. 각 장면의 참고 이미지, 시간대, 카메라 이동과 한·영 프롬프트를 함께 정리했습니다."
      ],
      [
        "merchant-final.png",
        "장사꾼 대화 장면의 수묵화풍 적용 화면",
        "수묵화풍 인물과 풍경을 적용한 제작 화면입니다."
      ]
    ]
  },
  {
    "id": "interface",
    "title": "UI와 웹 구현",
    "items": [
      [
        "archive-comparison.png",
        "수사자와 암사자의 표면색과 형태를 나란히 보여 주는 Index 제작 화면",
        "두 석사자의 실제 표면색을 켜고, 정보 패널과 공통 관찰 지점을 함께 확인한 아카이브 제작 화면입니다."
      ]
    ]
  }
];
(() => {
  const dialog = document.getElementById('process-gallery');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const image = dialog.querySelector('.gallery-image');
  const title = dialog.querySelector('#gallery-title');
  const caption = dialog.querySelector('#gallery-caption');
  const count = dialog.querySelector('.gallery-count');
  const previous = dialog.querySelector('[data-gallery-previous]');
  const next = dialog.querySelector('[data-gallery-next]');
  const close = dialog.querySelector('[data-gallery-close]');
  let current;
  let index = 0;
  let opener;

  function render() {
    const [file, alt, description] = current.items[index];
    image.src = './assets/' + file;
    image.alt = alt;
    dialog.querySelector('[data-gallery-original]').href = image.src;
    caption.textContent = description;
    count.textContent = `${index + 1} / ${current.items.length}`;
    previous.setAttribute('aria-disabled', String(index === 0));
    next.setAttribute('aria-disabled', String(index === current.items.length - 1));
    previous.hidden = next.hidden = current.items.length < 2;
  }

  function move(offset) {
    const position = index + offset;
    if (position < 0 || position >= current.items.length) return;
    index = position;
    render();
  }

  document.querySelectorAll('[data-gallery]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const gallery = processGalleries.find(item => item.id === link.dataset.gallery);
      if (!gallery) return;
      event.preventDefault();
      current = gallery;
      index = 0;
      opener = link;
      title.textContent = current.title;
      render();
      dialog.showModal();
      document.body.classList.add('gallery-open');
      close.focus({preventScroll: true});
    });
  });

  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('gallery-open');
    opener?.focus({preventScroll: true});
  });
})();

// A short, non-blocking notice when entering this work-in-progress page.
(() => {
  const notice = document.getElementById('preparation-notice');
  if (!notice) return;
  let timer;
  function show() {
    clearTimeout(timer);
    notice.hidden = false;
    notice.classList.add('is-visible');
    timer = setTimeout(() => {
      notice.hidden = true;
      notice.classList.remove('is-visible');
    }, 5800);
  }
  (document.fonts?.ready || Promise.resolve()).then(show);
  window.addEventListener('pageshow', event => { if (event.persisted) show(); });
  window.addEventListener('pagehide', () => {
    clearTimeout(timer);
    notice.hidden = true;
    notice.classList.remove('is-visible');
  });
})();
