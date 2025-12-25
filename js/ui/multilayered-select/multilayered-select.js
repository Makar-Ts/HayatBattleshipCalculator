import { isElementInViewport } from "../../../libs/utils.js";

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
    const container = select.find(' > .options');
    const label = select.find(" > label");
    const options = select.find(" .option");
    const groups =  select.find(" .group");

    select
      .off('click')
      .on('click', () => {
        select.attr('data-active', select.attr('data-active') == "true" ? "false" : "true")
        if (!isElementInViewport(container[0])) {
          container.attr('data-reversed', 'true');
        } else {
          container.attr('data-reversed', 'false');
        }
      })
    
    groups
      .off('mouseenter')
      .on('mouseenter', (e) => {
        let elem;
        if (e.target.tagName === 'LABEL') {
          elem = $(e.target.parentElement).find(' > .contains')[0];
        } else {
          elem = $(e.target).find(' > .contains')[0];
        }

        if (!elem) return;

        if (isElementInViewport(elem)) {
          elem.dataset.reversed = 'false';
        } else {
          elem.dataset.reversed = 'true';
        }
      })
    
    groups
      .off('mouseleave')
      .on('mouseleave', (e) => {
        let elem;
        if (e.target.tagName === 'LABEL') {
          elem = $(e.target.parentElement).find(' > .contains')[0];
        } else {
          elem = $(e.target).find(' > .contains')[0];
        }

        if (!elem) return;

        elem.dataset.reversed = 'false';
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