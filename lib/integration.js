"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilingIntegration = void 0;
const utils_1 = require("@sentry/utils");
const env_1 = require("./env");
const utils_2 = require("./utils");
const INTEGRATION_NAME = 'ProfilingIntegration';
class ProfilingIntegration {
    constructor() {
        this.name = INTEGRATION_NAME;
        this.getCurrentHub = undefined;
    }
    setupOnce(addGlobalEventProcessor, getCurrentHub) {
        this.getCurrentHub = getCurrentHub;
        addGlobalEventProcessor(this.handleGlobalEvent.bind(this));
    }
    handleGlobalEvent(event) {
        if (this.getCurrentHub === undefined) {
            return (0, utils_2.maybeRemoveProfileFromSdkMetadata)(event);
        }
        if ((0, utils_2.isProfiledTransactionEvent)(event)) {
            // Client, Dsn and Transport are all required to be able to send the profiling event to Sentry.
            // If either of them is not available, we remove the profile from the transaction event.
            // and forward it to the next event processor.
            const hub = this.getCurrentHub();
            const client = hub.getClient();
            if (!client) {
                if ((0, env_1.isDebugBuild)()) {
                    utils_1.logger.log('[Profiling] getClient did not return a Client, removing profile from event and forwarding to next event processors.');
                }
                return (0, utils_2.maybeRemoveProfileFromSdkMetadata)(event);
            }
            const dsn = client.getDsn();
            if (!dsn) {
                if ((0, env_1.isDebugBuild)()) {
                    utils_1.logger.log('[Profiling] getDsn did not return a Dsn, removing profile from event and forwarding to next event processors.');
                }
                return (0, utils_2.maybeRemoveProfileFromSdkMetadata)(event);
            }
            const transport = client.getTransport();
            if (!transport) {
                if ((0, env_1.isDebugBuild)()) {
                    utils_1.logger.log('[Profiling] getTransport did not return a Transport, removing profile from event and forwarding to next event processors.');
                }
                return (0, utils_2.maybeRemoveProfileFromSdkMetadata)(event);
            }
            // If all required components are available, we construct a profiling event envelope and send it to Sentry.
            if ((0, env_1.isDebugBuild)()) {
                utils_1.logger.log('[Profiling] Preparing envelope and sending a profiling event.');
            }
            transport.send((0, utils_2.createProfilingEventEnvelope)(event, dsn, client.getOptions()._metadata));
        }
        // Ensure sdkProcessingMetadata["profile"] is removed from the event before forwarding it to the next event processor.
        return (0, utils_2.maybeRemoveProfileFromSdkMetadata)(event);
    }
}
exports.ProfilingIntegration = ProfilingIntegration;