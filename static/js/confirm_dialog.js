import $ from "jquery";
import Micromodal from "micromodal";

import render_confirm_dialog from "../templates/confirm_dialog.hbs";

import * as blueslip from "./blueslip";
import * as loading from "./loading";
import * as overlays from "./overlays";

/*
 *  Look for confirm_dialog in settings_user_groups
 *  to see an example of how to use this widget.  It's
 *  pretty simple to use!
 *
 *  Some things to note:
 *      1) We create DOM on the fly, and we remove
 *         the DOM once it's closed.
 *
 *      2) We attach the DOM for the modal to the body element
 *         to avoid interference from other elements.
 *
 *      3) For settings, we have a click handler in settings.js
 *         that will close the dialog via overlays.close_active_modal.
 *
 *      4) We assume that since this is a modal, you will
 *         only ever have one confirm dialog active at any
 *         time.
 *
 *      5) If a modal wants a loading spinner, it should pass loading_spinner: true.
 *         This will show a loading spinner when the yes button is clicked.
 *         The caller is responsible for calling hide_confirm_dialog_spinner()
 *         to hide the spinner in both success and error handlers.
 *
 *      6) we use Micromodal for confirm dialogs instead of Bootstrap.
 *         Micromodal's onShow and onClose modal functions are run at the same time as
 *         Bootstrap's show.bs.modal and hide.bs.modal events.
 *         Unfortunately, Micromodal doesn't support hidden.bs.modal and shown.bs.modal.
 *         So, we use the native `animationend` event and use the animation
 *         name from it to figure out whether the modal is completely shown or hidden.
 *
 *      7) If loading_spinner is used, don't hide it on `success`. This modal has a fade out
 *         animation. This causes the `Confirm` button to be shown for a split second if the
 *         spinner is hidden.
 *         Just close the modal. This will remove the whole modal from the DOM without
 *         needing to remove the spinner.
 *
 *      8) Use meaningful text for the yes button that indicates the outcome of the decision
 *         rather than the generic "Confirm". For instance, use "Delete" for deleting a message.
 *
 *      9) The yes_button is focused when the modal is shown to facilitate accessibility.
 *         Pass `disable_focus_yes_button` as true to disable this behavior in dangerous operations.
 */

export function hide_confirm_dialog_spinner() {
    $("#confirm-dialog-yes-button span").show();
    $("#confirm-dialog-modal .modal__btn").prop("disabled", false);

    const spinner = $("#confirm-dialog-modal .modal__spinner");
    loading.destroy_indicator(spinner);
}

export function show_confirm_dialog_spinner() {
    $("#confirm-dialog-yes-button span").hide();
    // Disable both the buttons.
    $("#confirm-dialog-modal .modal__btn").prop("disabled", true);

    const spinner = $("#confirm-dialog-modal .modal__spinner");
    loading.make_indicator(spinner);
}

export function close_modal() {
    Micromodal.close("confirm-dialog-modal");
}

export function launch(conf) {
    const conf_fields = [
        // The next three fields should be safe HTML. If callers
        // interpolate user data into strings, they should use
        // templates.
        "html_heading",
        "html_body",
        "html_yes_button",
        "on_click",
    ];

    for (const f of conf_fields) {
        if (conf[f] === undefined) {
            blueslip.error("programmer omitted " + f);
        }
    }

    const confirm_dialog_html = render_confirm_dialog({
        heading_html: conf.html_heading,
        link: conf.help_link,
    });
    const confirm_dialog = $(confirm_dialog_html);

    $("body").append(confirm_dialog);

    // Close any existing modals--on settings screens you can
    // have multiple buttons that need confirmation.
    if (overlays.is_modal_open()) {
        close_modal();
    }

    confirm_dialog.find(".modal__content").prepend(conf.html_body);

    const yes_button_span = confirm_dialog.find("#confirm-dialog-yes-button span");

    yes_button_span.html(conf.html_yes_button);

    const yes_button = confirm_dialog.find("#confirm-dialog-yes-button");
    // Set up handlers.
    yes_button.on("click", () => {
        if (conf.loading_spinner) {
            show_confirm_dialog_spinner();
        } else {
            close_modal();
        }
        $("#confirm-dialog-error").html("");
        conf.on_click();
    });

    confirm_dialog.find(".modal__container").on("animationend", (event) => {
        const animation_name = event.originalEvent.animationName;
        if (animation_name === "mmfadeIn") {
            // Equivalent to bootstrap's "shown.bs.modal" event

            // Micromodal adds the is-open class before the modal animation
            // is complete, which isn't true since a modal is open after the
            // animation is complete. So, we manually add a class after the
            // animation is complete.
            confirm_dialog.addClass("modal--open");
            confirm_dialog.removeClass("modal--opening");
        } else if (animation_name === "mmfadeOut") {
            // Equivalent to bootstrap's "hidden.bs.modal" event
            confirm_dialog.remove();
        }
    });

    Micromodal.show("confirm-dialog-modal", {
        awaitCloseAnimation: true,
        onShow: () => {
            if (!conf.disable_focus_yes_button) {
                yes_button.trigger("focus");
            }
        },
        disableFocus: true,
        openClass: "modal--opening",
    });
}
