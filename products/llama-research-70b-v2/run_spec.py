"""
SCALE run-spec code for Llama-Research-70B-v2.
"""


def generate_scale_spec():
    return {
        "model": "Llama-Research-70B-v2",
        "parameters": "70B",
        "data_mix": "15T multilingual text and code",
        "compute": "2048 H100 / 60 day",
        "flops": "6.3e24",
        "chinchilla_clean": True,
        "fp8": True
    }


if __name__ == "__main__":
    spec = generate_scale_spec()
    print(f"Model: {spec['model']}")
    print(f"Data mix: {spec['data_mix']}")
