const name =
  new URL(location.href).searchParams.get('page') === 'roadmap'
    ? 'Team roadmap'
    : 'Project notes'
document.title = name
document.querySelector('#title').textContent = name
