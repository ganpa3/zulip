import * as dialog_widget from "./dialog_widget";

export function launch(conf) {
    dialog_widget.launch({
        ...conf,
        close_on_submit: true,
        danger_submit_button: true,
        focus_submit_on_open: true,
        // Used to control button colors in the template.
    });
}
