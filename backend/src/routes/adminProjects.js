// 관리자 페이지 전용 프로젝트 CRUD. 이 파일의 모든 라우트는 requireAdminAuth로 보호된다.
const express = require('express');
const db = require('../db');
const { requireAdminAuth } = require('../auth');

const router = express.Router();

const REQUIRED_FIELDS = ['title', 'role', 'description', 'date', 'teamSize'];
const FIELD_LABELS = {
  title: '제목',
  role: '내가 한 역할',
  description: '설명',
  date: '날짜',
  teamSize: '참여인원 수'
};

/**
 * status='published'일 때만 참고사항을 제외한 모든 항목이 채워져 있어야 한다.
 * status='draft'일 때는 어떤 항목이 비어 있어도 저장 가능하다.
 * @returns {string|null} 에러 메시지 (문제 없으면 null)
 */
function validateProjectPayload(data) {
  if (data.status !== 'draft' && data.status !== 'published') {
    return "status는 'draft' 또는 'published'여야 합니다.";
  }

  if (data.status === 'published') {
    for (const field of REQUIRED_FIELDS) {
      const value = data[field];
      if (value === undefined || value === null || String(value).trim() === '') {
        return `공개하려면 '${FIELD_LABELS[field]}' 항목을 입력해야 합니다.`;
      }
    }
  }

  return null;
}

router.use(requireAdminAuth);

// 관리자 화면 목록: 초안 포함 전체
router.get('/projects', (req, res) => {
  res.json(db.listAllProjects());
});

router.get('/projects/:id', (req, res) => {
  const project = db.getProjectById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: '해당 프로젝트를 찾을 수 없습니다.' });
  }
  res.json(project);
});

router.post('/projects', (req, res) => {
  const data = req.body || {};
  const validationError = validateProjectPayload(data);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const created = db.createProject(data);
    res.status(201).json(created);
  } catch (err) {
    console.error('[admin/projects] 생성 실패:', err.message);
    res.status(500).json({ error: '프로젝트를 저장하지 못했습니다.' });
  }
});

router.put('/projects/:id', (req, res) => {
  const data = req.body || {};
  const validationError = validateProjectPayload(data);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const updated = db.updateProject(req.params.id, data);
    if (!updated) {
      return res.status(404).json({ error: '해당 프로젝트를 찾을 수 없습니다.' });
    }
    res.json(updated);
  } catch (err) {
    console.error('[admin/projects] 수정 실패:', err.message);
    res.status(500).json({ error: '프로젝트를 수정하지 못했습니다.' });
  }
});

router.delete('/projects/:id', (req, res) => {
  const deleted = db.deleteProject(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: '해당 프로젝트를 찾을 수 없습니다.' });
  }
  res.json({ ok: true });
});

module.exports = router;
