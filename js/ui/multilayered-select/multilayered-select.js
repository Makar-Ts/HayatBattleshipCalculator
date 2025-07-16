let registerSelect = (jquery) => {};

const groupHTMLTemplate = `<div class="group">
  <label>{0}</label>
  <div class="contains">
    {1}
  </div>
</div>`

const optionHTMLTemplate = `<label class="option" value="{0}">{1}</label>`

export default function() {
  registerSelect = (jquery) => {
    const select = $(jquery);
    const label = select.find(" > label");
    const options = select.find(" .option");

    select
      .off('click')
      .on('click', () => {
        select.attr('data-active', select.attr('data-active') == "true" ? "false" : "true")
      })

    options
      .off('click')
      .on('click', (e) => {
        select.attr('value', $(e.target).attr('value'));
        if (label[0].innerHTML != e.target.innerHTML) {
          label.text(e.target.innerHTML);
          select.trigger("change");
        }
      })
    
    select.attr('value', $(options[0]).attr('value'));
    label.text(options[0].innerHTML);
  }

  $('.multilayered-select').each((index, element) => {
    registerSelect(element);
  })
}

export { groupHTMLTemplate, optionHTMLTemplate, registerSelect }