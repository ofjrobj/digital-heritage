// Each entry contains the image filename, alternative text, and caption.
const processGalleries = [
  {
    "id": "research",
    "title": "자료 조사와 스토리보드",
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
    "title": "스캔 데이터와 관찰 포인트",
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
    "title": "공주목의 공간 구성",
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
      ]
    ]
  },
  {
    "id": "style",
    "title": "그림체와 인물 디자인",
    "items": [
      [
        "character-merchant.png",
        "장사꾼의 앞모습과 옆모습, 뒷모습을 정리한 인물 설정화",
        "옷차림과 소품, 여러 방향의 모습을 정리한 장사꾼 디자인 자료입니다."
      ]
    ]
  },
  {
    "id": "motion",
    "title": "카메라 동선과 영상 제작",
    "items": [
      [
        "motion-blockout.png",
        "장사꾼 대화 장면의 3D 시안",
        "인물의 위치와 카메라 구도를 확인한 초기 3D 장면입니다."
      ],
      [
        "motion-illustration.jpg",
        "장사꾼 대화 장면의 일러스트 적용 시안",
        "같은 대화 구간에 인물과 풍경의 그림체를 적용하고 화면 구성을 점검했습니다."
      ]
    ]
  },
  {
    "id": "experience",
    "title": "화면과 소리의 연결",
    "items": [
      [
        "ui-story.png",
        "대사와 소리 조작 표시를 배치한 Story 화면 시안",
        "이야기 화면에 대사와 소리 조작 표시를 배치한 제작 중 시안입니다."
      ],
      [
        "ui-index.png",
        "수사자와 암사자를 나란히 비교하는 초기 Index 화면 시안",
        "두 모델과 관찰 항목, 설명 영역의 배치를 검토한 초기 Index 화면입니다."
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
