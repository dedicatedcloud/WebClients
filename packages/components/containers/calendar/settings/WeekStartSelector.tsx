import { c } from 'ttag';

import { userSettingsActions } from '@proton/account/userSettings';
import { useUserSettings } from '@proton/account/userSettings/hooks';
import { DropdownSizeUnit } from '@proton/components/components/dropdown/utils';
import Option from '@proton/components/components/option/Option';
import SelectTwo from '@proton/components/components/selectTwo/SelectTwo';
import { getAutomaticText } from '@proton/components/containers/general/helper';
import useApi from '@proton/components/hooks/useApi';
import useNotifications from '@proton/components/hooks/useNotifications';
import { useLoading } from '@proton/hooks';
import { useDispatch } from '@proton/redux-shared-store';
import { updateWeekStart } from '@proton/shared/lib/api/settings';
import { dateLocaleCode } from '@proton/shared/lib/i18n';
import { getBrowserLocale } from '@proton/shared/lib/i18n/helper';
import { loadDateLocale } from '@proton/shared/lib/i18n/loadLocale';
import { SETTINGS_WEEK_START, type UserSettings } from '@proton/shared/lib/interfaces';
import { getDefaultWeekStartsOn } from '@proton/shared/lib/settings/helper';

interface Props {
    className?: string;
    unstyledSelect?: boolean;
    shortText?: boolean;
}

const WeekStartSelector = ({ className, unstyledSelect, shortText = false }: Props) => {
    const api = useApi();
    const [userSettings] = useUserSettings();
    const dispatch = useDispatch();
    const { createNotification } = useNotifications();
    const [loading, withLoading] = useLoading();

    const handleWeekStart = async (value: SETTINGS_WEEK_START) => {
        await loadDateLocale(dateLocaleCode, getBrowserLocale(), { ...userSettings, WeekStart: value });
        const { UserSettings } = await api<{ UserSettings: UserSettings }>(updateWeekStart(value));
        dispatch(userSettingsActions.set({ UserSettings }));
        createNotification({ text: c('Success').t`Preference saved` });
    };

    const days = [
        { text: c('Day').t`Sunday`, value: SETTINGS_WEEK_START.SUNDAY },
        { text: c('Day').t`Monday`, value: SETTINGS_WEEK_START.MONDAY },
        { text: c('Day').t`Tuesday`, value: SETTINGS_WEEK_START.TUESDAY },
        { text: c('Day').t`Wednesday`, value: SETTINGS_WEEK_START.WEDNESDAY },
        { text: c('Day').t`Thursday`, value: SETTINGS_WEEK_START.THURSDAY },
        { text: c('Day').t`Friday`, value: SETTINGS_WEEK_START.FRIDAY },
        { text: c('Day').t`Saturday`, value: SETTINGS_WEEK_START.SATURDAY },
    ];

    const defaultDay = days[getDefaultWeekStartsOn()].text;

    const selectOptions = [
        { text: getAutomaticText(defaultDay), value: SETTINGS_WEEK_START.LOCALE_DEFAULT },
        ...days.filter(({ value }) =>
            [SETTINGS_WEEK_START.SUNDAY, SETTINGS_WEEK_START.MONDAY, SETTINGS_WEEK_START.SATURDAY].includes(value)
        ),
    ];

    return (
        <SelectTwo
            className={className}
            id="week-start-select"
            value={userSettings.WeekStart}
            loading={loading}
            disabled={loading}
            onChange={({ value }) => withLoading(handleWeekStart(value))}
            aria-describedby="label-week-start-select"
            unstyled={unstyledSelect}
            size={{ width: DropdownSizeUnit.Dynamic }}
            renderSelected={
                shortText
                    ? (selected) => {
                          if (selected === SETTINGS_WEEK_START.LOCALE_DEFAULT) {
                              // translater: as in "Automatic"
                              return <>{c('Option').t`Auto`}</>;
                          }
                          const selectedDay = days.find((day) => day.value === selected);
                          return <>{selectedDay?.text}</>;
                      }
                    : undefined
            }
        >
            {selectOptions.map((option) => {
                return <Option title={option.text} value={option.value} key={option.value} />;
            })}
        </SelectTwo>
    );
};

export default WeekStartSelector;
