<?php declare(strict_types = 0);

/**
 * Host items state widget form view.
 *
 * @var CView  $this
 * @var array  $data
 */

(new CWidgetFormView($data))
	->addField(
		new CWidgetFieldRadioButtonListView($data['fields']['source'])
	)
	->addField(
		new CWidgetFieldMultiSelectHostView($data['fields']['hostid'])
	)
	->addField(
		new CWidgetFieldRadioButtonListView($data['fields']['graph_type'])
	)
	->addField(
		new CWidgetFieldCheckBoxView($data['fields']['show_total'])
	)
	->addField(
		new CWidgetFieldRadioButtonListView($data['fields']['legend_pos'])
	)
	->addField(
		new CWidgetFieldCheckBoxView($data['fields']['show_links'])
	)
	->show();
