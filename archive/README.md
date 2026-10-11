# 석사자의 결 — GitHub Pages 배포본

이 폴더는 GitHub Pages 저장소에 올릴 웹 코드입니다. `release-assets/`는 Git에 올리지 마세요. 그 안의 대용량 OBJ/BMP 파일은 GitHub Release의 `models-v1` 릴리스 자산으로 별도 업로드합니다.

## 배포 순서

1. GitHub에서 공개 저장소를 만듭니다. 예: `seok-saja-archive`.
2. 이 폴더의 **웹 코드만** 저장소에 올립니다. `release-assets/` 폴더는 제외됩니다.
3. 저장소의 **Releases → Draft a new release**에서 태그를 정확히 `models-v1`로 만듭니다.
4. 릴리스 자산으로 `release-assets/numbered-lion.obj`, `release-assets/female-lion.obj`, `release-assets/numbered-lion.bmp`를 업로드하고 공개합니다.
5. `model-assets.js`에는 `00moonsun0-droid/seoksajaarchive` Release 주소가 설정되어 있습니다.
6. 저장소 **Settings → Pages**에서 `Deploy from a branch`, `main`, `/(root)`를 선택해 배포합니다.

배포 URL은 `https://<사용자명>.github.io/<저장소명>/` 형식입니다.

## 출처·권리

- 3D 모델 자산: 저작자 `00moonsun0-droid`가 직접 모델링한 것으로 확인됨. 이용 조건은 [ASSET-LICENSE.md](ASSET-LICENSE.md)를 따릅니다.
- 이 저장소의 웹 코드 및 문서: [LICENSE.md](LICENSE.md)의 All Rights Reserved 조건을 따릅니다.

- 배경 이미지: 원 프로젝트에 포함된 사용자 제공 파일 `ebba0da6-7d08-4223-91e3-d24fb9b09bc3.png`.
- 3D 뷰어: [Three.js](https://threejs.org/), [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html), [OBJLoader](https://threejs.org/docs/pages/OBJLoader.html).
- 3D 모델의 원형이 된 대상이나 참조 자료에 제3자의 스캔·사진·텍스처가 포함된 경우, 해당 자료의 이용 허락은 별도로 확인해야 합니다.

## GitHub 제한 근거

- 일반 GitHub 저장소는 100MiB보다 큰 파일을 차단합니다: [About large files on GitHub](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).
- Git LFS는 GitHub Pages에서 사용할 수 없습니다: [About Git Large File Storage](https://docs.github.com/en/enterprise-cloud@latest/repositories/working-with-files/managing-large-files/about-git-large-file-storage).
- GitHub Releases는 대형 바이너리 배포 방법으로 안내됩니다: [About large files on GitHub](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).
