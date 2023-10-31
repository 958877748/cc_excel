const Excel = require("./Excel");

// panel/index.js, this filename needs to match the one registered in package.json
Editor.Panel.extend({
    // css style for panel
    style: `
    :host { margin: 5px; }
    h2 { color: #f90; }
  `,

    // html template for panel
    template: `
    <h2>cc_excel</h2>
    <hr />
    <div>State: <span id="label">--</span></div>
    <hr />
    <ui-button id="btn">Excel To Json</ui-button>
  `,

    // element and variable binding
    $: {
        btn: '#btn',
        label: '#label',
    },

    // method executed when template and styles are successfully loaded and initialized
    ready() {
        let excel = new Excel(this.$label)
        this.$btn.addEventListener('confirm', () => {
            excel.toJson()
        });
    },

    // register your ipc messages here
    messages: {
        'cc_excel:hello'(event) {
            this.$label.innerText = 'Hello!';
        }
    }
});
