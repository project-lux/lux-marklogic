/*
 * This script may be used to sort the queue count of one or more app servers, providing
 * insights as to whether their maximum was hit, thereby potentially rejecting some and
 * relying on the caller to retry.  An app server's maximum queue size for the cluster is:
 *
 * App server thread count * cluster node count * 2
 *
 * This below-described input data only needs to be pulled from one node as the metric is
 * the sum of all nodes in the cluster.
 *
 * Set the queueSizesArr variable to the "queue-size" app server metric of one or more
 * app servers for the period of interest.  Use the "Get App Server Queue Metrics"
 * Postman request to retrieve the superset of data required by this code.  That
 * request consumes /manage/v2/servers?&server-metrics=queue-size, but includes other
 * parameters.  Within the output, locate the app server(s) of interest by app server
 * name within:
 *
 * server-metrics-list.metrics-relations.server-metrics-list.metrics.queue-size.detail
 */

// BEGIN: Script configuration
const includeRawValuesInOutput = false;
// END: Script configuration

const queueSizesArr = [
  {
    id: '10422722120638936346',
    name: 'lux',
    'server-type': 'http-server',
    data: {
      entry: [
        {
          dt: '2024-01-26T16:30:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:31:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:32:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:33:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:34:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:35:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:36:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:37:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:38:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:39:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:40:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:41:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:42:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:43:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:44:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:45:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:46:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:47:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:48:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:49:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:50:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:51:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:52:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:53:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:54:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:55:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:56:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:57:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:58:00Z',
          value: 4,
        },
        {
          dt: '2024-01-26T16:59:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:00:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:01:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:02:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:03:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:04:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:05:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:06:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:07:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:08:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:09:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:10:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:11:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:12:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:13:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:14:00Z',
          value: 2,
        },
        {
          dt: '2024-01-26T17:15:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:16:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:17:00Z',
          value: 1,
        },
        {
          dt: '2024-01-26T17:18:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:19:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:20:00Z',
          value: 34,
        },
        {
          dt: '2024-01-26T17:21:00Z',
          value: 32,
        },
        {
          dt: '2024-01-26T17:22:00Z',
          value: 11,
        },
        {
          dt: '2024-01-26T17:23:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:24:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T17:25:00Z',
          value: 26,
        },
        {
          dt: '2024-01-26T17:26:00Z',
          value: 30,
        },
        {
          dt: '2024-01-26T17:27:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T17:28:00Z',
          value: 72,
        },
        {
          dt: '2024-01-26T17:29:00Z',
          value: 52,
        },
        {
          dt: '2024-01-26T17:30:00Z',
          value: 11,
        },
        {
          dt: '2024-01-26T17:31:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:32:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T17:33:00Z',
          value: 71,
        },
        {
          dt: '2024-01-26T17:34:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:35:00Z',
          value: 108,
        },
        {
          dt: '2024-01-26T17:36:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T17:37:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T17:38:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T17:39:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T17:40:00Z',
          value: 42,
        },
        {
          dt: '2024-01-26T17:41:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T17:42:00Z',
          value: 108,
        },
        {
          dt: '2024-01-26T17:43:00Z',
          value: 48,
        },
        {
          dt: '2024-01-26T17:44:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T17:45:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:46:00Z',
          value: 72,
        },
        {
          dt: '2024-01-26T17:48:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:49:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T17:50:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:51:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T17:52:00Z',
          value: 10,
        },
        {
          dt: '2024-01-26T17:53:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:55:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T17:56:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:57:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:58:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T17:59:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:00:00Z',
          value: 29,
        },
        {
          dt: '2024-01-26T18:01:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T18:02:00Z',
          value: 72,
        },
        {
          dt: '2024-01-26T18:03:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:04:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:05:00Z',
          value: 18,
        },
        {
          dt: '2024-01-26T18:06:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:07:00Z',
          value: 5,
        },
        {
          dt: '2024-01-26T18:08:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:09:00Z',
          value: 37,
        },
        {
          dt: '2024-01-26T18:10:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T18:11:00Z',
          value: 56,
        },
        {
          dt: '2024-01-26T18:12:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T18:13:00Z',
          value: 42,
        },
        {
          dt: '2024-01-26T18:14:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T18:15:00Z',
          value: 50,
        },
        {
          dt: '2024-01-26T18:16:00Z',
          value: 72,
        },
        {
          dt: '2024-01-26T18:17:00Z',
          value: 28,
        },
        {
          dt: '2024-01-26T18:18:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T18:19:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:20:00Z',
          value: 72,
        },
        {
          dt: '2024-01-26T18:21:00Z',
          value: 52,
        },
        {
          dt: '2024-01-26T18:22:00Z',
          value: 57,
        },
        {
          dt: '2024-01-26T18:23:00Z',
          value: 79,
        },
        {
          dt: '2024-01-26T18:24:00Z',
          value: 44,
        },
        {
          dt: '2024-01-26T18:25:00Z',
          value: 58,
        },
        {
          dt: '2024-01-26T18:26:00Z',
          value: 72,
        },
        {
          dt: '2024-01-26T18:27:00Z',
          value: 108,
        },
        {
          dt: '2024-01-26T18:28:00Z',
          value: 81,
        },
        {
          dt: '2024-01-26T18:29:00Z',
          value: 72,
        },
        {
          dt: '2024-01-26T18:30:00Z',
          value: 8,
        },
        {
          dt: '2024-01-26T18:31:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:32:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:33:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:34:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:35:00Z',
          value: 36,
        },
        {
          dt: '2024-01-26T18:36:00Z',
          value: 72,
        },
        {
          dt: '2024-01-26T18:37:00Z',
          value: 72,
        },
        {
          dt: '2024-01-26T18:38:00Z',
          value: 53,
        },
        {
          dt: '2024-01-26T18:39:00Z',
          value: 72,
        },
        {
          dt: '2024-01-26T18:40:00Z',
          value: 105,
        },
        {
          dt: '2024-01-26T18:41:00Z',
          value: 80,
        },
        {
          dt: '2024-01-26T18:42:00Z',
          value: 47,
        },
        {
          dt: '2024-01-26T18:43:00Z',
          value: 72,
        },
        {
          dt: '2024-01-26T18:44:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:45:00Z',
          value: 15,
        },
        {
          dt: '2024-01-26T18:46:00Z',
          value: 48,
        },
        {
          dt: '2024-01-26T18:47:00Z',
          value: 72,
        },
        {
          dt: '2024-01-26T18:48:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:49:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:50:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:51:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:52:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:53:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:54:00Z',
          value: 9,
        },
        {
          dt: '2024-01-26T18:55:00Z',
          value: 5,
        },
        {
          dt: '2024-01-26T18:56:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:57:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:58:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:59:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T19:00:00Z',
          value: 0,
        },
      ],
    },
  },
  {
    id: '17515031592050179076',
    name: 'lux-2',
    'server-type': 'http-server',
    data: {
      entry: [
        {
          dt: '2024-01-26T16:30:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:31:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:32:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:33:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:34:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:35:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:36:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:37:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:38:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:39:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:40:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:41:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:42:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:43:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:44:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:45:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:46:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:47:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:48:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:49:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:50:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:51:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:52:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:53:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:54:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:55:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:56:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:57:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:58:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T16:59:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:00:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:01:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:02:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:03:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:04:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:05:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:06:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:07:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:08:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:09:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:10:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:11:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:12:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:13:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:14:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:15:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:16:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:17:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:18:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:19:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:20:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:21:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:22:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:23:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:24:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:25:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:26:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:27:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:28:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:29:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:30:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:31:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:32:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:33:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:34:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:35:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:36:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:37:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:38:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:39:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:40:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:41:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:42:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:43:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:44:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:45:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:46:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:48:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:49:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:50:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:51:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:52:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:53:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:55:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:56:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:57:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:58:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T17:59:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:00:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:01:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:02:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:03:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:04:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:05:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:06:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:07:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:08:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:09:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:10:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:11:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:12:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:13:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:14:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:15:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:16:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:17:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:18:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:19:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:20:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:21:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:22:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:23:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:24:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:25:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:26:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:27:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:28:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:29:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:30:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:31:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:32:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:33:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:34:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:35:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:36:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:37:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:38:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:39:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:40:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:41:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:42:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:43:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:44:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:45:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:46:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:47:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:48:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:49:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:50:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:51:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:52:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:53:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:54:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:55:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:56:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:57:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:58:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T18:59:00Z',
          value: 0,
        },
        {
          dt: '2024-01-26T19:00:00Z',
          value: 0,
        },
      ],
    },
  },
];

const metrics = queueSizesArr.map((item) => {
  // Get just the values and sort from greatest to least.
  const values = item.data.entry
    .map((entry) => {
      return Number(entry.value);
    })
    .sort(function (a, b) {
      return b - a;
    });

  // Determine the number of times the maximum was reached.
  const largestQueueSize = values[0];
  let largestQueueSizeCount = 0;
  let greaterThanOneCount = 0;
  let totalQueuedRequestCount = 0;
  values.forEach((val) => {
    if (largestQueueSize == val) {
      largestQueueSizeCount++;
    }
    if (val > 0) {
      greaterThanOneCount++;
    }
    totalQueuedRequestCount += val;
  });

  return {
    appServer: item.name,
    largestQueueSize,
    largestQueueSizeCount,
    greaterThanOneCount,
    dataPointCount: values.length,
    totalQueuedRequestCount,
    values: includeRawValuesInOutput
      ? values
      : 'omitted per script configuration',
  };
});

metrics;
export default metrics;
