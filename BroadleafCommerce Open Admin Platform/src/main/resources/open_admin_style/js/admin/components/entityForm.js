/*
 * #%L
 * BroadleafCommerce Open Admin Platform
 * %%
 * Copyright (C) 2009 - 2016 Broadleaf Commerce
 * %%
 * Licensed under the Broadleaf Fair Use License Agreement, Version 1.0
 * (the "Fair Use License" located  at http://license.broadleafcommerce.org/fair_use_license-1.0.txt)
 * unless the restrictions on use therein are violated and require payment to Broadleaf in which case
 * the Broadleaf End User License Agreement (EULA), Version 1.1
 * (the "Commercial License" located at http://license.broadleafcommerce.org/commercial_license-1.1.txt)
 * shall apply.
 * 
 * Alternatively, the Commercial License may be replaced with a mutually agreed upon license (the "Custom License")
 * between you and Broadleaf Commerce. You may not use this file except in compliance with the applicable license.
 * #L%
 */

(function($, BLCAdmin) {

    var excludedEFSectionTabSelectors = [];

    var originalStickyBarOffset = $('.sticky-container').offset().top;
    var originalStickyBarHeight = $('.sticky-container').height();
    
    BLCAdmin.entityForm = {
        showActionSpinner : function ($actions) {
            $("#headerFlashAlertBoxContainer").addClass("hidden");
            $actions.find('button').prop("disabled",true);
            $actions.find('img.ajax-loader').show();
        },

        addExcludedEFSectionTabSelector : function(selector) {
            excludedEFSectionTabSelectors.push(selector);
        },

        getExcludedEFSectionTabSelectorString : function() {
            var excludedSelectors = '';
            for (var i=0;i<excludedEFSectionTabSelectors.length;i++){
                excludedSelectors += ', ' + excludedEFSectionTabSelectors[i];
            }
            return excludedSelectors;
        },

        /**
         * Should happen after the AJAX request completes
         */
        hideActionSpinner : function () {
            var $actions = $('.entity-form-actions');
            $actions.find('button').prop("disabled",false);
            $actions.find('img.ajax-loader').hide();
        },

        showErrors : function (data, alertMessage) {
            $.each( data.errors , function( idx, error ){
                if (error.errorType == "field") {
                    var fieldGroup = $("#field-" + error.field);
                    if (BLCAdmin.currentModal() !== undefined) {
                        fieldGroup = BLCAdmin.currentModal().find("#field-" + error.field);
                    }

                    if (fieldGroup.length) {
                        // Add an error indicator to the fields tab
                        // this can happen more than once because the indicator is absolute positioning
                        var tabId = '#' + fieldGroup.parents('.entityFormTab').attr("class").substring(0, 4);
                        var $tabWithError = $('a[href=' + tabId + ']');
                        if (BLCAdmin.currentModal() !== undefined) {
                            $tabWithError = BLCAdmin.currentModal().find('a[href=' + tabId + ']');
                        }
                        $tabWithError.prepend('<span class="tab-error-indicator danger"></span>');

                        // Mark the field as an error
                        var fieldError = "<div class='error'";
                        if (fieldGroup.find(".field-help").length !== 0) {
                            fieldError += " style='margin-top:-5px;'";
                        }
                        fieldError += ">" + error.message + "</div>";

                        $(fieldGroup).append(fieldError);
                        $(fieldGroup).addClass("has-error");
                    } else {
                        var error = "<div class='tabError'><span class='error'>" + error.message + "</span></div>";
                        $(".entity-errors").append(error);
                    }
                } else if (error.errorType == 'global'){
                    var globalError = "<div class='tabError'><b>" + BLCAdmin.messages.globalErrors + "</b><span class='error'>"
                        + error.message + "</span></div>";
                    $(".entity-errors").append(globalError);
                }
            });
            BLCAdmin.entityForm.showErrorHeaderAlert(alertMessage);
        },

        showErrorHeaderAlert : function (alertMessage) {
            if (typeof BLCAdmin.currentModal() === 'undefined') {
                $('#headerFlashAlertBoxContainer .alert-box').removeClass('success').addClass('alert');
                $('#headerFlashAlertBoxContainer .alert-box-message').text(alertMessage);
            } else if (BLCAdmin.currentModal().find('#headerFlashAlertBoxContainer .alert-box').length) {
                var $headerFlashAlertBoxContainer = BLCAdmin.currentModal().find('#headerFlashAlertBoxContainer');
                $headerFlashAlertBoxContainer.find('.alert-box').removeClass('success').addClass('alert');
                $headerFlashAlertBoxContainer.find('.alert-box-message').text(alertMessage);
            } else {
                var $modalFooter = BLCAdmin.currentModal().find('.modal-footer');
                var headerFlashAlertBoxContainer = '<div id="headerFlashAlertBoxContainer"><div id="headerFlashAlertBox" class="alert-box">' +
                    '<span class="alert-box-message"></span></div></div>';
                $modalFooter.append(headerFlashAlertBoxContainer);

                var $headerFlashAlertBoxContainer = $modalFooter.find('#headerFlashAlertBoxContainer');
                $headerFlashAlertBoxContainer.find('.alert-box').removeClass('success').addClass('alert');
                $headerFlashAlertBoxContainer.find('.alert-box-message').text(alertMessage);
            }
        },

        swapModalEntityForm : function ($modal, newHtml) {
            $modal.find('.modal-header .tabs-container').replaceWith($(newHtml).find('.modal-body .tabs-container'));
            // Show field-level validation errors
            $modal.find('.modal-body .tabs-content').replaceWith($(newHtml).find('.modal-body .tabs-content'));
            // Show EntityForm error list
            var errorDiv = $(newHtml).find('.modal-body .errors');
            if (errorDiv.length) {
                //since we only replaced the content of the modal body, ensure the error div gets there as well
                var currentErrorDiv = $modal.find('.modal-body .errors');
                if (currentErrorDiv.length) {
                    currentErrorDiv.replaceWith(errorDiv)
                } else {
                    $modal.find('.modal-body').prepend(errorDiv);
                }
            }
        },

        submitFormViaAjax : function ($form) {
            var submit = BLCAdmin.runSubmitHandlers($form);

            if (submit) {
                BLC.ajax({
                    url: $form.attr('action'),
                    dataType: "json",
                    type: "POST",
                    data: BLCAdmin.serializeArray($form)
                }, function (data) {
                    BLCAdmin.entityForm.hideActionSpinner();

                    $(".errors, .error, .tab-error-indicator, .tabError").remove();
                    $('.has-error').removeClass('has-error');

                    if (!data.errors) {

                        var $titleBar = $form.closest('.main-content').find('.content-area-title-bar');
                        BLCAdmin.alert.showAlert($titleBar, 'Successfully ' + BLCAdmin.messages.saved + '!', {
                            alertType: 'save-alert',
                            autoClose: 2000,
                            clearOtherAlerts: true
                        });

                        if (!$('.modal:not(#expire-message)').length && $('.entity-form').length) {
                            if (BLCAdmin.entityForm.status) {
                                BLCAdmin.entityForm.status.clearEntityFormChanges();
                            }
                        }

                    } else {
                        BLCAdmin.entityForm.showErrors(data, BLCAdmin.messages.problemSaving);
                        if (BLCAdmin.entityForm.status) {
                            BLCAdmin.entityForm.status.setDidConfirmLeave(false);
                        }
                    }

                    BLCAdmin.runPostFormSubmitHandlers($form, data);
                });
            }
        },

        makeFieldsReadOnly : function ($form) {
            $form = typeof $form !== 'undefined' ? $form : $('body').find('.main-content .content-yield').find('form');

            var $tabsContent =$form.find('.tabs-content');
            // General input fields
            $tabsContent.find('input').prop('disabled', true).addClass('disabled');

            // Redactor fields
            $tabsContent.find('textarea').prop('disabled', true).addClass('disabled').show();
            $tabsContent.find('textarea').css({color: 'rgb(84, 84, 84)', padding: 'padding: 12px', border: 'none'});
            $tabsContent.find('.redactor-box').css('border', 'none');
            $tabsContent.find('.redactor-toolbar').hide();
            $tabsContent.find('.redactor-editor').hide();

            // Radio buttons
            $tabsContent.find('label.radio-label').prop('disabled', true).addClass('disabled');

            // ListGrid actions
            $tabsContent.find('.listgrid-toolbar a').prop('disabled', true).addClass('disabled');
            $tabsContent.find('.listgrid-row-actions a').prop('disabled', true).addClass('disabled');

            // Selectize
            $tabsContent.find('.selectize-control .selectize-input').addClass('disabled');

            // Rule builder
            var $ruleBuilders = $tabsContent.find('.rule-builder-simple, .rule-builder-simple-time, .rule-builder-with-quantity');
            $ruleBuilders.find('.rules-group-header button').prop('disabled', true).addClass('disabled');
            $ruleBuilders.find('.rules-group-body button').prop('disabled', true).addClass('disabled');
            $ruleBuilders.find('.button.and-button').prop('disabled', true).addClass('disabled');
            $ruleBuilders.find('.toggle-container label').addClass('disabled');
        },

        getOriginalStickyBarOffset : function() {
            return originalStickyBarOffset;
        },

        getOriginalStickyBarHeight : function() {
            return originalStickyBarHeight;
        },

        toggleFieldVisibility : function($field, shouldShow) {
            var hideGroupIfFieldsAreHidden = function ($field) {
                var $groupContent = $field.closest('.fieldset-card-content');
                var $card = $groupContent.closest('.fieldset-card');
                var $fields = $groupContent.find('.field-group');
                var $hiddenFields = $fields.filter(function() { return $(this).css('display') === 'none' });

                if ($fields.length === $hiddenFields.length) {
                    $card.addClass('hidden');
                } else {
                    $card.removeClass('hidden');
                    if ($card.find('.titlebar .collapsed').length && !$groupContent.hasClass('content-collapsed')) {
                        $card.find('.titlebar').click();
                    }
                }
            };

            $field.toggle(shouldShow);

            if (shouldShow) {
                $field.removeClass('hidden');
            }

            hideGroupIfFieldsAreHidden($field);
        }
    };
})(jQuery, BLCAdmin);

$(document).ready(function() {

    /**
     * Make the sticky bar (breadcrumb) lock at the top of the window when it's scrolled off the page
     */
    $('.main-content').on('scroll', function() {
        if (!$('form.entity-form').length || $('.oms').length)  {
            return;
        }
        var $sc = $('.sticky-container');
        var $scp = $('.sticky-container-padding');
        var height = BLCAdmin.entityForm.getOriginalStickyBarHeight();
        var minHeight = height - 30;

        $scp.show();
        $sc.addClass('sticky-fixed').css('top', BLCAdmin.entityForm.getOriginalStickyBarOffset());
        $sc.outerWidth($('.main-content').outerWidth());
        $('.sticky-container-padding').outerHeight(height);

        if ($('.main-content').scrollTop() <= 30) {
            var scroll = $('.main-content').scrollTop();
            $sc.find('.content-area-title-bar').css('height', height - scroll);
            $sc.find('.content-area-title-bar').css('line-height', height - scroll + 'px');
            $sc.find('.content-area-title-bar .ajax-loader').css('margin-top', 30 - scroll / 2 + 'px');
            $sc.find('.content-area-title-bar h3:not(.line-height-fixed)').css('line-height', height - scroll + 'px');
            $sc.find('.content-area-title-bar .dropdown-menu').css('margin-top', (-22 + scroll / 2) + 'px');
        } else {
            $sc.find('.content-area-title-bar').css('height', minHeight + 'px');
            $sc.find('.content-area-title-bar').css('line-height', minHeight + 'px');
            $sc.find('.content-area-title-bar .ajax-loader').css('margin-top', '17px');
            $sc.find('.content-area-title-bar h3:not(.line-height-fixed)').css('line-height', minHeight + 'px');
            $sc.find('.content-area-title-bar .dropdown-menu').css('margin-top', '-7px');
        }
    });

    /**
     * Initialize the sticky bar
     */
    if ($('form.entity-form').length && !$('.oms').length) {
        var $sc = $('.sticky-container');
        var $scp = $('.sticky-container-padding');
        var height = BLCAdmin.entityForm.getOriginalStickyBarHeight();

        $scp.show();
        $sc.addClass('sticky-fixed').css('top', BLCAdmin.entityForm.getOriginalStickyBarOffset());
        $sc.outerWidth($('.main-content').outerWidth());
        $scp.outerHeight(height);

        $sc.find('.content-area-title-bar').css('height', height);
        $sc.find('.content-area-title-bar').css('line-height', height + 'px');
        $sc.find('.content-area-title-bar h3:not(.line-height-fixed)').css('line-height', height + 'px');
        $sc.find('.content-area-title-bar .dropdown-menu').css('margin-top', '-22px');
    }
    
    var tabs_action=null;
    $('body div.section-tabs li').find('a:not(".workflow-tab, .system-property-tab' +
            BLCAdmin.entityForm.getExcludedEFSectionTabSelectorString() + '")').click(function(event) {
        var $tab = $(this);
        var $tabBody = $('.' + $tab.attr('href').substring(1) + 'Tab');
        var tabKey = $tab.find('span').data('tabkey');
        var $form = BLCAdmin.getForm($tab);
        var href = $(this).attr('href').replace('#', '');
        var currentAction = $form.attr('action');
        var tabUrl = encodeURI(currentAction + '/1/' + tabKey);

     	if (tabs_action && tabs_action.indexOf(tabUrl + '++') == -1 && tabs_action.indexOf(tabUrl) >= 0) {
     		tabs_action = tabs_action.replace(tabUrl, tabUrl + '++');
     	} else if (tabs_action && tabs_action.indexOf(tabUrl) == -1) {
     		tabs_action += ' / ' + tabUrl;
     	} else if (tabs_action == null) {
     		tabs_action = tabUrl;
     	}

     	if (tabs_action.indexOf(tabUrl + '++') == -1 && !$tab.hasClass('first-tab')) {
            showTabSpinner($tab, $tabBody);

     		BLC.ajax({
     			url: tabUrl,
     			type: "POST",
     			data: $form.serializeArray()
     		}, function(data) {
     			$('div.' + href + 'Tab .listgrid-container').find('.listgrid-header-wrapper table').each(function() {
     				var tableId = $(this).attr('id').replace('-header', '');
                    var $tableWrapper = data.find('.listgrid-header-wrapper:has(table#' + tableId + ')');
     				BLCAdmin.listGrid.replaceRelatedCollection($tableWrapper);
                    BLCAdmin.listGrid.updateGridTitleBarSize($(this).closest('.listgrid-container').find('.fieldgroup-listgrid-wrapper-header'));
     			});
     			$('div.' + href + 'Tab .selectize-wrapper').each(function() {
     				var tableId = $(this).attr('id');
                    var $selectizeWrapper = data.find('.selectize-wrapper#' + tableId);
     				BLCAdmin.listGrid.replaceRelatedCollection($selectizeWrapper);
     			});
                $('div.' + href + 'Tab .media-container').each(function() {
                    var tableId = $(this).attr('id');
                    tableId = tableId.replace(".", "\\.");
                    var $container = data.find('#' + tableId);
                    var $assetGrid = $($container).find('.asset-grid-container');
                    var $assetListGrid = data.find('.asset-listgrid');

                    BLCAdmin.assetGrid.initialize($assetGrid);

                    $(this).find('.asset-grid-container').replaceWith($assetGrid);
                });

                hideTabSpinner($tab, $tabBody);
     		});

     		event.preventDefault();

     	}
     });


    // When the delete button is clicked, we can change the desired action for the
    // form and submit it normally (not via AJAX).
    $('body').on('click', 'button.delete-button, a.delete-button', function(event) {
        var $button = $(this);
        var mustConfirm = $button.data('confirm');
        var confirmMsg = $button.data('confirm-text');

        BLCAdmin.confirmProcessBeforeProceeding(mustConfirm, confirmMsg, processDeleteCall, [$button]);

        function processDeleteCall (params) {
            var $deleteButton = params[0];
            var $form = BLCAdmin.getForm($deleteButton);

            var currentAction = $form.attr('action');
            var deleteUrl = currentAction + '/delete';

            BLCAdmin.entityForm.showActionSpinner($deleteButton.closest('.entity-form-actions'));

            // On success this should redirect, on failure we'll get some JSON back
            BLC.ajax({
                url: deleteUrl,
                type: "POST",
                data: $form.serializeArray(),
                complete: BLCAdmin.entityForm.hideActionSpinner()
            }, function (data) {
                $("#headerFlashAlertBoxContainer").removeClass("hidden");
                $(".errors, .error, .tab-error-indicator, .tabError").remove();
                $('.has-error').removeClass('has-error');

                if (!data.errors) {
                    var $titleBar = $form.closest('.main-content').find('.content-area-title-bar');
                    BLCAdmin.alert.showAlert($titleBar, 'Successfully ' + BLCAdmin.messages.deleted + '!', {
                        alertType: 'save-alert',
                        autoClose: 2000,
                        clearOtherAlerts: true
                    });
                } else {
                    BLCAdmin.entityForm.showErrors(data, BLCAdmin.messages.problemDeleting);
                }

                BLCAdmin.runPostFormSubmitHandlers($form, data);
            });

            event.preventDefault();
        }
    });

    $('body').on('click', 'button.submit-button, a.submit-button', function(event) {
        var $button = $(this);
        if ($button.hasClass('disabled') || $button.is(':disabled')) {
            return;
        }

        var mustConfirm = $button.data('confirm');
        var confirmMsg = $button.data('confirm-text');

        BLCAdmin.confirmProcessBeforeProceeding(mustConfirm, confirmMsg, processSubmitCall, [$button]);

        function processSubmitCall(params) {
            var $submitButton = params[0];

            $('body').click(); // Defocus any current elements in case they need to act prior to form submission
            var $form = BLCAdmin.getForm($submitButton);

            BLCAdmin.entityForm.showActionSpinner($submitButton.closest('.content-area-title-bar.entity-form-actions'));

            // This is a save, we need to enable the page to be reloaded (in the case of an initial save)
            if (BLCAdmin.entityForm.status) {
                BLCAdmin.entityForm.status.setDidConfirmLeave(true);
            }

            if ($(".blc-admin-ajax-update").length && $form.parents(".modal-body").length == 0) {
                BLCAdmin.entityForm.submitFormViaAjax($form);
            } else {
                $form.submit();
            }

            event.preventDefault();
        }
    });

    function getTabText($tab) {
        return $tab.clone()    //clone the element
            .children() //select all the children
            .remove()   //remove all the children
            .end()  //again go back to selected element
            .text()
            .trim();
    }

    function showTabSpinner($tab, $tabBody) {
        $("#headerFlashAlertBoxContainer").addClass("hidden");
        $tabBody.find('button').prop("disabled", true);
        $tab.find('i.fa-spinner').show();
    }

    function hideTabSpinner($tab, $tabBody) {
        $tabBody.find('button:not(.row-action)').prop("disabled", false);
        $tab.find('i.fa-spinner').hide();
    }

    $('body').on('submit', 'form.entity-form', function(event) {
        var submit = BLCAdmin.runSubmitHandlers($(this));
        return submit;
    });
    
    $('body').on('submit', 'form.modal-add-entity-form', function(event) {
        var $form = $(this);
        var submit = BLCAdmin.runSubmitHandlers($form);
        
        if (submit) {
            BLC.ajax({
                url: this.action,
                type: "POST",
                data: BLCAdmin.serialize($form)
            }, function(data) {
                BLCAdmin.runPostFormSubmitHandlers($form, data);

                BLCAdmin.ruleBuilders.removeModalRuleBuilders($form);
                var $modal = BLCAdmin.currentModal();

                if ($modal) {
                    BLCAdmin.entityForm.swapModalEntityForm($modal, data);

                    BLCAdmin.initializeFields($modal.find('.modal-body .tabs-content'));
                    $modal.find('.submit-button').show();
                    $modal.find('img.ajax-loader').hide();
                }
            });
        }
        return false;
    });

    $('body').on('submit', 'form.modal-form', function (event) {
        var $form = $(this);
        var submit = BLCAdmin.runSubmitHandlers($form);

        if (submit) {
            BLC.ajax({
                url: this.action,
                type: "POST",
                data: BLCAdmin.serialize($form)
            }, function (data) {
                BLCAdmin.runPostFormSubmitHandlers($form, data);

                BLCAdmin.entityForm.hideActionSpinner($form.closest('.modal').find('.entity-form-actions'));

                //if there is a validation error, replace the current form that's there with this new one
                var $newForm = $(data).find('.modal-body form');
                if ($newForm[0]) {
                    BLCAdmin.ruleBuilders.removeModalRuleBuilders($form);
                    //with adorned forms, we have just overwritten the related id property that was selected previously. Ensure
                    //to replace that in the new form
                    var $adornedTargetIdProperty = $(data).find('input#adornedTargetIdProperty');
                    var isAdornedModal = false;
                    if ($adornedTargetIdProperty[0]) {
                        $adornedTargetIdProperty.val($form.find('input#adornedTargetIdProperty').val());
                        isAdornedModal = true;
                    }
                    //we are potentially replacing a form that has tabs. Ensure those are removed from the replacing form so
                    //we don't get double-tabs
                    $newForm.find('.tabs-container').remove();

                    //ensure the active tab fields on the old form is active on the new form
                    var $modal = $form.closest('.modal');
                    $modal.find('dl.tabs dd').each(function (tabIndex, tab) {
                        if ($(tab).hasClass('active')) {
                            var $contentTabs;
                            $contentTabs = $newForm.find('> ul.tabs-content > li');
                            $contentTabs.removeClass('active');
                            $($contentTabs[tabIndex]).addClass('active').css('display', 'block');
                        }
                    });

                    //swap out the forms
                    $form.replaceWith($newForm);

                    //since we just replaced everything, initialize all the fields back. See BLCAdmin.showModal
                    BLCAdmin.initializeModalTabs($(BLCAdmin.currentModal()));
                    BLCAdmin.initializeModalButtons($(BLCAdmin.currentModal()));
                    BLCAdmin.initializeFields();

                    var $actions = BLCAdmin.currentModal().find('.entity-form-actions');
                    $actions.find('button').show();
                    $actions.find('img.ajax-loader').hide();
                } else {

                    var $assetGrid = $(data).find('.asset-grid-container');
                    if ($assetGrid.length) {
                        var $assetListGrid = $(data).find('.asset-listgrid');

                        BLCAdmin.assetGrid.initialize($assetGrid);

                        $('.asset-grid-container').replaceWith($assetGrid);
                        $('.asset-listgrid').replaceWith($assetListGrid);

                        $('.listgrid-container').each(function (index, container) {
                            BLCAdmin.listGrid.initialize($(container));
                        });
                        BLCAdmin.hideCurrentModal();

                    } else {
                        BLCAdmin.hideCurrentModal();

                        BLCAdmin.listGrid.replaceRelatedCollection($(data), {
                            message: BLCAdmin.messages.saved + '!',
                            alertType: 'save-alert',
                            autoClose: 3000
                        });
                    }
                }
            });
        }
        return false;
    });

    /*
     * On hiding the modal, remove any rule-builders added inside of the modal. This needs to happen on using the 'close'
     * and 'submit' buttons.
     *
     * A click listener cannot be used on the 'close' button because other listeners are fired
     * earlier and a listener added here never gets fired. Therefore, because the on-hide listener does get fired, the
     * rule builders will be removed after that event.
     */
    $('body').on('hide', '.modal', function () {
        BLCAdmin.ruleBuilders.removeModalRuleBuilders($(this));
    });

    $('body').on('click', 'a.media-link', function(event) {
        event.preventDefault();

        var link = $(this).attr('data-link');
        link += $(this).attr('data-queryparams');

        BLCAdmin.showLinkAsModal(link);
    });

    $('body').on('click', 'a.media-grid-remove', function() {
        var $container = $(this).closest('.asset-listgrid-container');

        var asset = $(this).parent().siblings('img');
        var link = $(asset).attr('data-link');
        link += $(this).attr('data-urlpostfix');
        link += $(this).attr('data-queryparams');

        var id = $(asset).data('rowid');
        var $tr = $(this).closest('.select-group').find('.listgrid-container').find('tr[data-rowid=' + id + ']');
        var rowFields = BLCAdmin.listGrid.getRowFields($tr);

        BLC.ajax({
            url: link,
            data: rowFields,
            type: "POST"
        }, function(data) {
            if (data.status == 'error') {
                BLCAdmin.listGrid.showAlert($container, data.message);
            } else {
                var $assetGrid = $(data).find('.asset-grid-container');
                var $assetListGrid = $(data).find('.asset-listgrid');

                BLCAdmin.assetGrid.initialize($assetGrid);

                $container.find('.asset-grid-container').replaceWith($assetGrid);
                $container.find('.asset-listgrid').replaceWith($assetListGrid);

                $container.find('.listgrid-container').each(function (index, container) {
                    BLCAdmin.listGrid.initialize($(container));
                });
            }
        });

        return false;
    });

    $('body').on('click', 'a.titlebar', function(event) {
        event.preventDefault();

        var $collapser = $(this).find('.collapser span');
        var content = $(this).closest('.fieldset-card').find('.fieldset-card-content')[0];
        if ($collapser.hasClass('collapsed')) {
            $collapser.removeClass('collapsed').addClass('expanded');
            $collapser.text("(hide)");
            $(content).removeClass('content-collapsed');

            // update content height
            BLCAdmin.updateContentHeight($(this));
        } else {
            $collapser.removeClass('expanded').addClass('collapsed');
            $collapser.text("(show)");
            $(content).addClass('content-collapsed');
        }

        var $fieldSetCard = $(this).closest('.fieldset-card');
        var $tableBodies = $fieldSetCard.find('.listgrid-body-wrapper tbody');
        $tableBodies.each(function( index, tbody ) {
            BLCAdmin.listGrid.paginate.updateGridSize($(tbody));
        });
        $fieldSetCard.find('.fieldgroup-listgrid-wrapper-header').each(function (index, element) {
            BLCAdmin.listGrid.updateGridTitleBarSize($(element));
        });
    });

    $('body').on('click', 'a.description-link', function(event) {
        event.preventDefault();

        var field = $(this).closest('.description-field');
        // show the textarea or input
        if ($(field).find('textarea').length) {
            $(field).find('textarea').show().focus();
        } else {
            $(field).find('input').show().focus();
        }

        // hide the read-only text
        $(this).parent().hide();
    });

    $('body').on('blur', '.description-field textarea, .description-field input', function(event) {
        event.preventDefault();

        var field = $(this).closest('.description-field');

        // hide the textarea or input
        var descriptionText = $(field).find('textarea').val();
        if (descriptionText !== undefined) {
            $(field).find('textarea').hide();
        } else {
            descriptionText = $(field).find('input').val();
            $(field).find('input').hide();
        }

        // show the read-only text
        if (descriptionText.length) {
            descriptionText += '<a href="" class="description-link">&nbsp;&nbsp;(edit)</a>';
        } else {
            descriptionText = 'No description provided, <a href="" class="description-link">add one</a>';
        }
        $(field).find('.description-text').html(descriptionText);
        $(field).find('.description-text').show();
    });
});
