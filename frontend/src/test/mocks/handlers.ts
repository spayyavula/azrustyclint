import { http, HttpResponse } from 'msw'

export const handlers = [
  // Auth handlers
  http.post('/api/v1/auth/register', async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      token: 'mock-token',
      user: {
        id: '123',
        email: body.email,
        username: body.username,
      },
    })
  }),

  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = await request.json() as any
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        token: 'mock-token',
        user: {
          id: '123',
          email: body.email,
          username: 'testuser',
        },
      })
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }),

  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json({
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
    })
  }),

  // Projects handlers
  http.get('/api/v1/projects', () => {
    return HttpResponse.json([
      {
        id: 'proj-1',
        name: 'Test Project',
        owner_id: '123',
        default_language: 'python',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ])
  }),

  http.post('/api/v1/projects', async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      id: 'proj-new',
      name: body.name,
      owner_id: '123',
      default_language: body.default_language,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }),

  http.get('/api/v1/projects/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Test Project',
      owner_id: '123',
      default_language: 'python',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  }),

  http.delete('/api/v1/projects/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // Files handlers
  http.get('/api/v1/projects/:projectId/files', () => {
    return HttpResponse.json([
      {
        id: 'file-1',
        project_id: 'proj-1',
        path: 'main.py',
        language: 'python',
      },
      {
        id: 'file-2',
        project_id: 'proj-1',
        path: 'utils/helpers.py',
        language: 'python',
      },
    ])
  }),

  http.get('/api/v1/files/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      project_id: 'proj-1',
      path: 'main.py',
      language: 'python',
      content: 'print("Hello, World!")',
    })
  }),

  http.post('/api/v1/files', async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      id: 'file-new',
      project_id: body.project_id,
      path: body.path,
      language: body.language,
      content: body.content,
    })
  }),

  http.put('/api/v1/files/:id', async ({ request, params }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      id: params.id,
      project_id: 'proj-1',
      path: 'main.py',
      language: 'python',
      content: body.content,
    })
  }),

  // Sandbox handlers
  http.post('/api/v1/sandbox/run', async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      stdout: 'Hello, World!\n',
      stderr: '',
      exit_code: 0,
      execution_time_ms: 42,
      timed_out: false,
    })
  }),
]
