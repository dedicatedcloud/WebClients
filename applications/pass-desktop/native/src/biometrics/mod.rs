use anyhow::Result;

#[cfg_attr(target_os = "windows", path = "windows.rs")]
#[cfg_attr(target_os = "macos", path = "macos.rs")]
#[cfg_attr(target_os = "linux", path = "linux.rs")]
mod biometrics_platform;

pub trait BiometricsTrait {
    fn can_check_presence() -> Result<bool>;
    fn check_presence(handle: Vec<u8>, reason: String) -> Result<()>;
    fn get_secret(key: String) -> Result<Vec<u8>>;
    fn set_secret(key: String, data: Vec<u8>) -> Result<()>;
    fn delete_secret(key: String) -> Result<()>;
}

pub use biometrics_platform::*;
