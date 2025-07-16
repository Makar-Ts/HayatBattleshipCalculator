let registerAccordeon = (jquery) => {};
let registerInnerAccordeons = (jquery) => {};

const accordeonHTMLTemplate = `<div class="ui-accordeon">
  <label>{0}</label>
  <div class="contains">
    {1}
  </div>
</div>`

export default function () {
  function calculateHeight(jquery) {
    let addedHeight = 0;

    $(jquery).find(".ui-accordeon > .contains").each(
      (i, elem) => addedHeight += Number(($(elem).css('--mx') || "0").replace('px', ''))
    )

    return $(jquery)[0].scrollHeight+addedHeight;
  }

  registerAccordeon = (jquery) => {
    const accordeon = $(jquery);
    const content = accordeon.find("> .contains");
    content.css('--mx', calculateHeight(content)+"px")

    accordeon.find("> label")
      .off("click")
      .on("click", (e) => {
        accordeon.attr("data-active", accordeon.attr("data-active") == "true" ? "false" : "true");
        content.css('--mx', calculateHeight(content)+"px")
      });
  };

  registerInnerAccordeons = (jquery) => {
    $(jquery).find('.ui-accordeon').each((i, elem) => registerAccordeon(elem))
  }

  $('.ui-accordeon').each((i, elem) => registerAccordeon(elem))
}

export { registerAccordeon, registerInnerAccordeons, accordeonHTMLTemplate }