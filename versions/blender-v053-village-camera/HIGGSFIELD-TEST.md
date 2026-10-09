# v051 — Higgsfield opening test

Copy of v050; original version is unchanged. Only the opening through the first merchant uses Higgsfield imagery/video. Later characters, recordings, music and Index retain the existing implementation.

## Visual sources
- Blender: Gongju_v049_Camera_3Key_ShortJourney.blend, entry / merchant arrival / half-body dialogue renders.
- Existing space-atlas plans and overall line sketch were used to understand scene placement. These are scene documentation, not evidence of exact historical architecture.
- User-provided ink landscape reference and root website background inform the clear gray/jade palette.
- Architecture is an illustrative interpretation of the simplified Blender layout; the generated video is not an exact baked Blender camera transfer.

## Final media
- cover.png: minimal line lion, Higgsfield image 2d2e1a8b-ba98-4fbf-bf94-3b9eb939d045.
- village.png: bright landscape with irregular pines and mist gaps, image 9e48dab8-d47a-476d-92ad-408189b1e658.
- intro.mp4: 8 seconds, first part of video 1fb51b3e-d236-4070-b10a-0e7bee540f0f, color-corrected and dissolved into the final landscape still. The final section uses a restrained still-image move. A full regeneration with the final palette was refused for insufficient boost credits; this is a hybrid test edit.
- approach.mp4: 10 seconds, video 3206037a-ee1a-493e-bf9b-1e229e64f959.
- dialogue.mp4: 12 seconds, video 8ff00781-0baf-4119-905f-19aef7608479, color-corrected. Existing Korean voice recording is separate; mouth movement is illustrative, not phoneme-synchronized.

All videos: Seedance 2.5 480p draft, silent generated output, H.264 faststart, keyframe interval 12 frames for scroll seeking. BGM and character voice are retained independently.

## Runtime
- Forward scroll advances, reverse scroll has half sensitivity.
- Merchant dialogue plays automatically, then scroll resumes.
- Only the visible video is sought; seeks are serialized and retain the latest target.
- Video readiness never blocks opening scroll; loading failures retain a poster and offer retry.
- The original 3D village loads near the first dialogue. Its hidden rendering is suspended while the film is shown.
- Story/Index navigation is preserved.
