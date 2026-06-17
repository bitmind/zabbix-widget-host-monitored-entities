<?php declare(strict_types = 0);

namespace Modules\HostItemsState\Actions;

use API,
	CControllerDashboardWidgetView,
	CControllerResponseData;

use Modules\HostItemsState\Widget;

class WidgetView extends CControllerDashboardWidgetView {

	protected function doAction(): void {
		$source = (int) $this->fields_values['source'];

		$vars = [
			'source'      => $source,
			'graph_type'  => $this->fields_values['graph_type'],
			'show_total'  => (bool) $this->fields_values['show_total'],
			'legend_pos'  => (int) $this->fields_values['legend_pos'],
			'show_links'  => (bool) $this->fields_values['show_links'],
			'hostid'      => null,
			'counts'      => null
		];

		if ($this->isTemplateDashboard() && !$this->fields_values['hostid']) {
			$this->setResponse(new CControllerResponseData([
				'name' => $this->getInput('name', $this->widget->getDefaultName()),
				'vars' => $vars,
				'user' => ['debug_mode' => $this->getDebugMode()]
			]));
			return;
		}

		$hostid = $this->fields_values['hostid']
			? $this->fields_values['hostid'][0]
			: null;

		$vars['hostid'] = $hostid;

		if ($hostid !== null) {
			switch ($source) {
				case Widget::SOURCE_TRIGGERS:
					$vars['counts'] = [
						'enabled'  => (int) API::Trigger()->get([
							'countOutput' => true,
							'hostids'     => [$hostid],
							'filter'      => [
								'status' => TRIGGER_STATUS_ENABLED,
								'state'  => TRIGGER_STATE_NORMAL
							]
						]),
						'unknown'  => (int) API::Trigger()->get([
							'countOutput' => true,
							'hostids'     => [$hostid],
							'filter'      => [
								'status' => TRIGGER_STATUS_ENABLED,
								'state'  => TRIGGER_STATE_UNKNOWN
							]
						]),
						'disabled' => (int) API::Trigger()->get([
							'countOutput' => true,
							'hostids'     => [$hostid],
							'filter'      => [
								'status' => TRIGGER_STATUS_DISABLED
							]
						])
					];
					break;

				case Widget::SOURCE_DISCOVERY:
					$vars['counts'] = [
						'enabled'      => (int) API::DiscoveryRule()->get([
							'countOutput' => true,
							'hostids'     => [$hostid],
							'filter'      => [
								'status' => ITEM_STATUS_ACTIVE,
								'state'  => ITEM_STATE_NORMAL
							]
						]),
						'notsupported' => (int) API::DiscoveryRule()->get([
							'countOutput' => true,
							'hostids'     => [$hostid],
							'filter'      => [
								'status' => ITEM_STATUS_ACTIVE,
								'state'  => ITEM_STATE_NOTSUPPORTED
							]
						]),
						'disabled'     => (int) API::DiscoveryRule()->get([
							'countOutput' => true,
							'hostids'     => [$hostid],
							'filter'      => [
								'status' => ITEM_STATUS_DISABLED
							]
						])
					];
					break;

				default: // Widget::SOURCE_ITEMS
					$vars['counts'] = [
						'normal'       => (int) API::Item()->get([
							'countOutput' => true,
							'hostids'     => [$hostid],
							'filter'      => [
								'status' => ITEM_STATUS_ACTIVE,
								'state'  => ITEM_STATE_NORMAL
							]
						]),
						'notsupported' => (int) API::Item()->get([
							'countOutput' => true,
							'hostids'     => [$hostid],
							'filter'      => [
								'status' => ITEM_STATUS_ACTIVE,
								'state'  => ITEM_STATE_NOTSUPPORTED
							]
						]),
						'disabled'     => (int) API::Item()->get([
							'countOutput' => true,
							'hostids'     => [$hostid],
							'filter'      => [
								'status' => ITEM_STATUS_DISABLED
							]
						])
					];
					break;
			}
		}

		$this->setResponse(new CControllerResponseData([
			'name' => $this->getInput('name', $this->widget->getDefaultName()),
			'vars' => $vars,
			'user' => ['debug_mode' => $this->getDebugMode()]
		]));
	}
}
