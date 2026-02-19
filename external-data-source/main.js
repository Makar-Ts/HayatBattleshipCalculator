const container = document.getElementById('container');

let dataSources = localStorage.getItem('dataSources');
if (!dataSources) 
  dataSources = [];
else dataSources = JSON.parse(dataSources);

const renderDataSources = () => {
  container.innerHTML = '';

  for (let index in dataSources) {
    const source = dataSources[index];
    const checkboxes = Object.entries(source.set).map(([k, v]) => `<input type="checkbox" class="${k}" ${v ? 'checked' : ''} /><label>${k}</label>`)

    container.innerHTML += `
      <div class="data-source">
        <input type="url" class="url" value="${source.url}" />
        ${checkboxes.join('\n')}
        <button class="delete" data-index="${index}">Delete</button>
      </div>
    `
  }

  container.querySelectorAll('.delete').forEach(button => {
    button.addEventListener('click', (e) => {
      const index = +e.target.dataset.index;

      dataSources = dataSources.filter((r, i) => i != index);

      renderDataSources();
    });
  });
}


document.getElementById('addSource').addEventListener('click', () => {
  dataSources.push({
    url: 'https://',
    set: {
      modules: false,
      modulesFunctions: false,
      battleships: false,
    }
  })

  renderDataSources();
})


document.getElementById('save').addEventListener('click', () => {
  const out = []

  for (let sources of document.getElementsByClassName('data-source')) {
    out.push({
      url: sources.getElementsByClassName('url')[0].value,
      set: {
        modules: sources.getElementsByClassName('modules')[0].checked,
        modulesFunctions: sources.getElementsByClassName('modulesFunctions')[0].checked,
        battleships: sources.getElementsByClassName('battleships')[0].checked,
      }
    })
  }

  localStorage.setItem('dataSources', JSON.stringify(out));
  dataSources = out;

  renderDataSources();
})


renderDataSources();