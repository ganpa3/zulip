import * as blueslip from "./blueslip";
import * as channel from "./channel";
import * as server_events from "./server_events";

export let next_local_id;
export const messages = new Map();

export function reset_id_state() {
    next_local_id = 0;
}

export function get_new_local_id() {
    next_local_id += 1;
    const local_id = next_local_id;
    return "loc-" + local_id.toString();
}

function report_send_time(send_time, receive_time, locally_echoed, rendered_changed) {
    const data = {
        time: send_time.toString(),
        received: receive_time.toString(),
        locally_echoed,
    };

    if (locally_echoed) {
        data.rendered_content_disparity = rendered_changed;
    }

    channel.post({
        url: "/json/report/send_times",
        data,
    });
}

export class MessageState {
    start = new Date();

    received = undefined;
    send_finished = undefined;
    rendered_content_disparity = false;

    constructor(opts) {
        this.local_id = opts.local_id;
        this.locally_echoed = opts.locally_echoed;
    }

    start_resend() {
        this.start = new Date();
        this.received = undefined;
        this.send_finished = undefined;
        this.rendered_content_disparity = false;
    }

    maybe_restart_event_loop() {
        if (this.received) {
            // We got our event, no need to do anything
            return;
        }

        blueslip.log(
            `Restarting get_events due to delayed receipt of sent message ${this.local_id}`,
        );

        server_events.restart_get_events();
    }

    maybe_report_send_times() {
        if (!this.ready()) {
            return;
        }
        report_send_time(
            this.send_finished - this.start,
            this.received - this.start,
            this.locally_echoed,
            this.rendered_content_disparity,
        );
    }

    report_event_received() {
        this.received = new Date();
        this.maybe_report_send_times();
    }

    mark_disparity() {
        this.rendered_content_disparity = true;
    }

    report_server_ack() {
        this.send_finished = new Date();
        this.maybe_report_send_times();

        // We only start our timer for events coming in here,
        // since it's plausible the server rejected our message,
        // or took a while to process it, but there is nothing
        // wrong with our event loop.

        if (!this.received) {
            setTimeout(() => this.maybe_restart_event_loop(), 5000);
        }
    }

    ready() {
        return this.send_finished !== undefined && this.received !== undefined;
    }
}

export function start_tracking_message(opts) {
    const local_id = opts.local_id;

    if (!opts.local_id) {
        blueslip.error("You must supply a local_id");
        return;
    }

    if (messages.has(local_id)) {
        blueslip.error("We are re-using a local_id");
        return;
    }

    const state = new MessageState(opts);

    messages.set(local_id, state);
}

export function get_message_state(local_id) {
    const state = messages.get(local_id);

    if (!state) {
        blueslip.warn("Unknown local_id: " + local_id);
    }

    return state;
}

export function mark_disparity(local_id) {
    const state = get_message_state(local_id);
    if (!state) {
        return;
    }
    state.mark_disparity();
}

export function report_event_received(local_id) {
    const state = get_message_state(local_id);
    if (!state) {
        return;
    }

    state.report_event_received();
}

export function start_resend(local_id) {
    const state = get_message_state(local_id);
    if (!state) {
        return;
    }

    state.start_resend();
}

export function report_server_ack(local_id) {
    const state = get_message_state(local_id);
    if (!state) {
        return;
    }

    state.report_server_ack();
}

export function initialize() {
    reset_id_state();
}
