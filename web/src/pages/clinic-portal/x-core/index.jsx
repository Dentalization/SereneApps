import XCore from '../../dentist-portal/x-core';
import ClinicSideBar from '../ui/SideBar-Clinic';

const ClinicXCore = () => (
  <XCore
    portal="clinic"
    SidebarComponent={ClinicSideBar}
    readOnly
    studiesEndpoint="/api/v1/x-core/clinic/studies"
    allowUpload={false}
  />
);

export default ClinicXCore;
