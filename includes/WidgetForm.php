<?php declare(strict_types = 0);

namespace Modules\HostItemsState\Includes;

use CWidgetsData;

use Zabbix\Widgets\{
	CWidgetField,
	CWidgetForm
};

use Zabbix\Widgets\Fields\{
	CWidgetFieldCheckBox,
	CWidgetFieldMultiSelectHost,
	CWidgetFieldRadioButtonList
};

use Modules\HostItemsState\Widget;

class WidgetForm extends CWidgetForm {

	public function addFields(): self {
		$host_field = (new CWidgetFieldMultiSelectHost('hostid', _('Host')))
			->setMultiple(false)
			->setInType(CWidgetsData::DATA_TYPE_HOST_ID)
			->acceptWidget()
			->acceptDashboard();

		if ($this->isTemplateDashboard()) {
			$host_field->setDefault([
				CWidgetField::FOREIGN_REFERENCE_KEY => CWidgetField::createTypedReference(
					CWidgetField::REFERENCE_DASHBOARD, CWidgetsData::DATA_TYPE_HOST_ID
				)
			]);
		}
		else {
			$host_field->setFlags(CWidgetField::FLAG_NOT_EMPTY | CWidgetField::FLAG_LABEL_ASTERISK);
		}

		return $this
			->addField(
				(new CWidgetFieldRadioButtonList('source', _('Source'), [
					Widget::SOURCE_ITEMS     => _('Items'),
					Widget::SOURCE_TRIGGERS  => _('Triggers'),
					Widget::SOURCE_DISCOVERY => _('Discovery rules')
				]))->setDefault(Widget::SOURCE_ITEMS)
			)
			->addField($host_field)
			->addField(
				(new CWidgetFieldRadioButtonList('graph_type', _('Graph type'), [
					Widget::GRAPH_TYPE_PIE            => _('Pie chart'),
					Widget::GRAPH_TYPE_HORIZONTAL_BAR => _('Horizontal bar'),
					Widget::GRAPH_TYPE_VERTICAL_BAR   => _('Vertical bar')
				]))->setDefault(Widget::GRAPH_TYPE_PIE)
			)
			->addField(
				(new CWidgetFieldCheckBox('show_legend', _('Show legend')))->setDefault(1)
			)
			->addField(
				new CWidgetFieldCheckBox('show_links', _('Enable links to configuration page'))
			);
	}

	public function validate(bool $strict = false): array {
		if ($strict && $this->isTemplateDashboard()) {
			$this->getField('hostid')->setValue([
				CWidgetField::FOREIGN_REFERENCE_KEY => CWidgetField::createTypedReference(
					CWidgetField::REFERENCE_DASHBOARD, CWidgetsData::DATA_TYPE_HOST_ID
				)
			]);
		}

		return parent::validate($strict);
	}
}
