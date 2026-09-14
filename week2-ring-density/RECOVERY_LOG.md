# 손상·복구 기록

- 무엇을 손상시켰나: `ring_density_table.md`의 1링 시설수를 5에서 500으로, 밀도를 6.37에서 637로 잘못 입력함 (커밋 `5993d00`).
- 어떻게 복구했나: `git checkout 63613be -- week2-ring-density/ring_density_table.md`로 직전 정상 커밋의 파일 내용을 가져와 값을 5 / 6.37로 되돌리고 새 커밋으로 저장함 (커밋 `52e8b18`).
